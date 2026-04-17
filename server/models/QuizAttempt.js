const mongoose = require("mongoose");

// answers is [Object] to match teammate's flexible schema
const quizAttemptSchema = new mongoose.Schema({
  quizId:        { type: mongoose.Schema.Types.ObjectId, ref: "quizzes",  required: true },
  courseId:      { type: mongoose.Schema.Types.ObjectId, ref: "courses",  required: true },
  studentId:     { type: mongoose.Schema.Types.ObjectId, ref: "users",    required: true },
  answers:       { type: [Object], default: [] },
  score:         { type: Number, default: 0 },
  percentage:    { type: Number, default: 0, min: 0, max: 100 },
  feedback:      { type: String, trim: true, default: "" },
  submittedAt:   { type: Date, default: Date.now },
  attemptNumber: { type: Number, default: 1 },
  timeTaken:     { type: Number, default: 0 },
}, { optimisticConcurrency: true });

quizAttemptSchema.index({ quizId: 1, studentId: 1 });
quizAttemptSchema.index({ courseId: 1 });
quizAttemptSchema.index({ studentId: 1 });

module.exports = mongoose.model("quizAttempts", quizAttemptSchema);
