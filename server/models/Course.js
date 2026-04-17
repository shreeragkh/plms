const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    category:    { type: String, trim: true, default: "" },
    startDate:   { type: Date, required: true },
    endDate:     { type: Date, required: true },
    status:      { type: String, enum: ["active", "archived", "completed"], default: "active" },
    thumbnail:   { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

courseSchema.index({ teacherId: 1, status: 1 });

module.exports = mongoose.model("courses", courseSchema);
