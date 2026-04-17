const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  chatSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "chatSessions", required: true },
  senderId:      { type: mongoose.Schema.Types.ObjectId, ref: "users",        required: true },
  senderRole:    { type: String, enum: ["student", "teacher", "admin", "ai"], required: true },
  message:       { type: String, required: true, trim: true },
  // teammate uses "system" instead of "ai_response"
  messageType:   { type: String, enum: ["text", "file", "system"], default: "text" },
  createdAt:     { type: Date, default: Date.now },
});

messageSchema.index({ chatSessionId: 1, createdAt: 1 });

module.exports = mongoose.model("messages", messageSchema);
