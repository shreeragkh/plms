const Assignment = require("../models/Assignment");
const Course = require("../models/Course");
const logActivity = require("../utils/logActivity");

// @GET /api/v1/assignments/course/:courseId
const getAssignmentsByCourse = async (req, res) => {
  try {
    const assignments = await Assignment.find({ courseId: req.params.courseId })
      .populate("teacherId", "name")
      .sort({ dueDate: 1 }); // soonest due first

    res.json({ success: true, count: assignments.length, assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/assignments/:id
const getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("teacherId", "name")
      .populate("courseId", "title");

    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });
    res.json({ success: true, assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/v1/assignments — Teacher creates assignment
const createAssignment = async (req, res) => {
  try {
    const { courseId, title, description, startDate, dueDate, totalMarks } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized for this course" });
    }

    const assignment = await Assignment.create({
      courseId, teacherId: req.user._id,
      title, description, startDate, dueDate, totalMarks,
    });

    await logActivity(req.user, "created_assignment", "Assignment", assignment._id, { title, courseId });
    res.status(201).json({ success: true, assignment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/assignments/:id
const updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });

    if (assignment.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const updated = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    res.json({ success: true, assignment: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @DELETE /api/v1/assignments/:id
const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });

    if (assignment.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await Assignment.findByIdAndDelete(req.params.id);
    await logActivity(req.user, "deleted_assignment", "Assignment", req.params.id);
    res.json({ success: true, message: "Assignment deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAssignmentsByCourse, getAssignment,
  createAssignment, updateAssignment, deleteAssignment,
};
