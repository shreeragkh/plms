const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const logActivity = require("../utils/logActivity");

// @GET /api/v1/courses — Browse active courses (students) or all (admin)
const getAllCourses = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const filter = {};

    // Logging for debugging role-based filtering
    console.log(`[CourseController] getAllCourses: user role = ${req.user.role}`);

    if (req.user.role === "student") {
      filter.status = "active";
    } else if (status) {
      filter.status = status;
    }
    // If it's a teacher or admin and no status is provided, we return everything.

    if (category) filter.category = { $regex: category, $options: "i" };
    if (search) filter.title = { $regex: search, $options: "i" };

    const courses = await Course.find(filter)
      .populate("teacherId", "name email department")
      .sort({ createdAt: -1 });

    console.log(`[CourseController] Found ${courses.length} courses for filter:`, JSON.stringify(filter));

    res.json({
      success: true,
      count: courses.length,
      courses: courses.map(c => ({
        ...c._doc,
        // Fallback for teacher name if populate failed
        teacherName: c.teacherId?.name || "Unknown Teacher"
      }))
    });
  } catch (err) {
    console.error(`[CourseController] Error in getAllCourses: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/courses/my — Teacher: their own courses
const getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ teacherId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: courses.length, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/courses/:id
const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("teacherId", "name email department");

    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/v1/courses
const createCourse = async (req, res) => {
  try {
    const { title, description, category, startDate, endDate, thumbnail, status } = req.body;
    
    // Explicitly set status to 'active' if not provided, ensuring visibility for students
    const course = await Course.create({
      title,
      description,
      category,
      startDate,
      endDate,
      thumbnail,
      status: status || "active",
      teacherId: req.user._id,
    });

    await logActivity(req.user, "created_course", "Course", course._id, { title });

    res.status(201).json({ success: true, course });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/courses/:id
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    await logActivity(req.user, "updated_course", "Course", course._id, { title: updated.title });

    res.json({ success: true, course: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/courses/:id/status — Set active | archived | completed
const updateCourseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    course.status = status;
    await course.save();

    await logActivity(req.user, `course_status_${status}`, "Course", course._id);
    res.json({ success: true, message: `Course marked as ${status}`, course });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @DELETE /api/v1/courses/:id
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await Course.findByIdAndDelete(req.params.id);
    await Enrollment.deleteMany({ courseId: req.params.id });
    await logActivity(req.user, "deleted_course", "Course", req.params.id, { title: course.title });

    res.json({ success: true, message: "Course deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/courses/:id/students — Teacher: enrolled students for a course
const getCourseStudents = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const enrollments = await Enrollment.find({ courseId: req.params.id })
      .populate("studentId", "name email department yearOrSemester")
      .sort({ enrolledAt: -1 });

    res.json({
      success: true,
      count: enrollments.length,
      students: enrollments.map(e => ({
        enrollmentId: e._id,
        enrolledAt:   e.enrolledAt,
        status:       e.status,
        student:      e.studentId,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllCourses, getMyCourses, getCourse,
  createCourse, updateCourse, updateCourseStatus,
  deleteCourse, getCourseStudents,
};
