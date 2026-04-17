const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  role:       { type: String, enum: ["student", "teacher", "admin"], required: true },
  action:     { type: String, required: true, trim: true },
  entityType: { type: String, required: true, trim: true },
  entityId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  // teammate uses String for details (not Mixed)
  details:    { type: String, trim: true, default: "" },
  createdAt:  { type: Date, default: Date.now },
});

activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("activityLogs", activityLogSchema);
