const AssignmentSubmission = require("../models/AssignmentSubmission");
const Assignment = require("../models/Assignment");
const { getFileType } = require("../middleware/uploadMiddleware");
const logActivity = require("../utils/logActivity");
const fs = require("fs");

// @POST /api/v1/assignment-submissions — Student submits file
const submitAssignment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Submission file is required" });
    }

    const { assignmentId } = req.body;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    // Check for re-submission (overwrite allowed)
    const existing = await AssignmentSubmission.findOne({
      assignmentId,
      studentId: req.user._id,
    });

    const now = new Date();
    
    // Strict enforcement of submission window
    if (now < new Date(assignment.startDate)) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "Assignment submission has not started yet." });
    }

    if (now > new Date(assignment.dueDate)) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "Assignment deadline has passed. Submissions are closed." });
    }

    const status = "submitted";

    let submission;
    if (existing) {
      // Overwrite previous submission file
      const oldPath = `${__dirname}/../${existing.fileUrl}`;
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      existing.fileUrl = `/uploads/assignments/${req.file.filename}`;
      existing.submittedAt = now;
      existing.status = status;
      existing.marks = null;
      existing.feedback = "";
      await existing.save();
      submission = existing;
    } else {
      submission = await AssignmentSubmission.create({
        assignmentId,
        courseId:  assignment.courseId,
        studentId: req.user._id,
        fileUrl:   `/uploads/assignments/${req.file.filename}`,
        status,
      });
    }

    await logActivity(req.user, "submitted_assignment", "Assignment", assignmentId, {
      assignmentTitle: assignment.title,
    });

    res.status(201).json({
      success: true,
      message: "Assignment submitted successfully",
      submission,
    });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/assignment-submissions/my — Student: their own submissions
const getMySubmissions = async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({ studentId: req.user._id })
      .populate("assignmentId", "title dueDate totalMarks")
      .populate("courseId", "title")
      .sort({ submittedAt: -1 });

    res.json({ success: true, count: submissions.length, submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/assignment-submissions/assignment/:assignmentId — Teacher: all submissions
const getSubmissionsByAssignment = async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({ assignmentId: req.params.assignmentId })
      .populate("studentId", "name email department yearOrSemester")
      .sort({ submittedAt: -1 });

    const graded   = submissions.filter((s) => s.status === "reviewed").length;
    const pending  = submissions.filter((s) => s.status !== "reviewed").length;
    const avgMarks = graded > 0
      ? Math.round(
          submissions.filter((s) => s.marks !== null)
            .reduce((sum, s) => sum + s.marks, 0) / graded
        )
      : 0;

    res.json({
      success: true,
      count: submissions.length,
      summary: { graded, pending, avgMarks },
      submissions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/assignment-submissions/:id/grade — Teacher grades a submission
const gradeSubmission = async (req, res) => {
  try {
    const { marks, feedback } = req.body;
    const submission = await AssignmentSubmission.findById(req.params.id)
      .populate("assignmentId", "totalMarks teacherId");

    if (!submission) return res.status(404).json({ success: false, message: "Submission not found" });

    // Only the assignment's teacher or admin can grade
    if (
      submission.assignmentId.teacherId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized to grade" });
    }

    if (marks > submission.assignmentId.totalMarks) {
      return res.status(400).json({
        success: false,
        message: `Marks cannot exceed total marks (${submission.assignmentId.totalMarks})`,
      });
    }

    submission.marks    = marks;
    submission.feedback = feedback || "";
    submission.status = "reviewed";
    await submission.save();

    await logActivity(req.user, "graded_assignment", "Assignment", submission.assignmentId._id, {
      studentId: submission.studentId,
      marks,
    });

    res.json({ success: true, message: "Submission graded", submission });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  submitAssignment,
  getMySubmissions,
  getSubmissionsByAssignment,
  gradeSubmission,
};
