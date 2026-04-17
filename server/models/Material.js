const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema({
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: "courses", required: true },
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "users",   required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  fileUrl:     { type: String, required: true, trim: true },
  fileType:    { type: String, required: true, trim: true },
  uploadedAt:  { type: Date, default: Date.now },
}, { optimisticConcurrency: true });

materialSchema.index({ courseId: 1 });

module.exports = mongoose.model("materials", materialSchema);
