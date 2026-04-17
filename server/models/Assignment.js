const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: "courses", required: true },
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "users",   required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  startDate:   { type: Date, required: true },
  dueDate:     { type: Date, required: true },
  totalMarks:  { type: Number, required: true },
  createdAt:   { type: Date, default: Date.now },
});

assignmentSchema.index({ courseId: 1 });

module.exports = mongoose.model("assignments", assignmentSchema);
