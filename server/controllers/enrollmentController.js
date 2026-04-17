const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const logActivity = require("../utils/logActivity");

// @POST /api/v1/enrollments — Student enrolls in a course
const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    if (course.status !== "active") {
      return res.status(400).json({ success: false, message: "Course is not open for enrollment" });
    }

    const existing = await Enrollment.findOne({ courseId, studentId: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: "Already enrolled in this course" });
    }

    const enrollment = await Enrollment.create({ courseId, studentId: req.user._id });
    await enrollment.populate("courseId", "title category teacherId");

    await logActivity(req.user, "enrolled_course", "Course", courseId, { courseTitle: course.title });

    res.status(201).json({ success: true, message: "Enrolled successfully", enrollment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/enrollments/my — Student: all their enrolled courses
const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate({
        path: "courseId",
        populate: { path: "teacherId", select: "name email" },
      })
      .sort({ enrolledAt: -1 });

    res.json({ success: true, count: enrollments.length, enrollments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/enrollments/course/:courseId — Teacher: students in a course
const getEnrollmentsByCourse = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ courseId: req.params.courseId })
      .populate("studentId", "name email department yearOrSemester")
      .sort({ enrolledAt: -1 });

    res.json({ success: true, count: enrollments.length, enrollments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/enrollments/:id/status — Update status (drop / complete)
const updateEnrollmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: "Enrollment not found" });

    const isOwner = enrollment.studentId.toString() === req.user._id.toString();
    if (!isOwner && !["teacher", "admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    enrollment.status = status;
    await enrollment.save();

    await logActivity(req.user, `enrollment_${status}`, "Course", enrollment.courseId);
    res.json({ success: true, enrollment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @DELETE /api/v1/enrollments/:id — Drop a course
const unenroll = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, message: "Enrollment not found" });

    const isOwner = enrollment.studentId.toString() === req.user._id.toString();
    if (!isOwner && !["teacher", "admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await Enrollment.findByIdAndDelete(req.params.id);
    await logActivity(req.user, "dropped_course", "Course", enrollment.courseId);

    res.json({ success: true, message: "Unenrolled successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  enrollInCourse, getMyEnrollments, getEnrollmentsByCourse,
  updateEnrollmentStatus, unenroll,
};
