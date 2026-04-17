const mongoose = require("mongoose");

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "assignments", required: true },
  courseId:     { type: mongoose.Schema.Types.ObjectId, ref: "courses",     required: true },
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: "users",       required: true },
  fileUrl:      { type: String, required: true, trim: true },
  submittedAt:  { type: Date, default: Date.now },
  marks:        { type: Number, default: 0 },
  feedback:     { type: String, trim: true, default: "" },
  // teammate uses "reviewed" not "graded"
  status:       { type: String, enum: ["submitted", "reviewed", "late"], default: "submitted" },
});

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
assignmentSubmissionSchema.index({ courseId: 1 });

module.exports = mongoose.model("assignmentSubmissions", assignmentSubmissionSchema);
