const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: "users",   required: true },
  // courseId optional (null = general chat) — teammate has required:true but we keep flexible
  courseId:      { type: mongoose.Schema.Types.ObjectId, ref: "courses", default: null },
  role:          { type: String, enum: ["student", "teacher", "admin"], required: true },
  startedAt:     { type: Date, default: Date.now },
  lastMessageAt: { type: Date, default: Date.now },
}, { optimisticConcurrency: true });

chatSessionSchema.index({ userId: 1 });
chatSessionSchema.index({ courseId: 1 });

module.exports = mongoose.model("chatSessions", chatSessionSchema);
