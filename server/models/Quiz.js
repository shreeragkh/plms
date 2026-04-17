const mongoose = require("mongoose");

// questions is [Object] to match teammate's flexible schema
// AI teammate can store any question structure they need
const quizSchema = new mongoose.Schema({
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: "courses", required: true },
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "users",   required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  questions:   { type: [Object], default: [] },
  totalMarks:  { type: Number, default: 0 },
  createdBy:   { type: String, enum: ["teacher", "ai"], default: "teacher" },
  isPublished: { type: Boolean, default: false },
  dueDate:     { type: Date },
  timeLimit:   { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
});

quizSchema.index({ courseId: 1, isPublished: 1 });

module.exports = mongoose.model("quizzes", quizSchema);
