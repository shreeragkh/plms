const ActivityLog = require("../models/ActivityLog");
const logger = require("../config/logger");

/**
 * Fire-and-forget activity logger.
 * entityType must be a String (e.g. "course", "quiz", "assignment")
 */
const logActivity = async (user, action, entityType = "system", entityId = null, details = "") => {
  try {
    await ActivityLog.create({
      userId:     user._id,
      role:       user.role,
      action,
      entityType: entityType.toLowerCase(),
      entityId:   entityId || user._id,
      details:    typeof details === "object" ? JSON.stringify(details) : (details || ""),
    });
    console.log(`[System] 📝 ACTIVITY LOG RECORDED: ${action} (User: ${user.name})`);
  } catch (err) {
    logger.error(`ActivityLog failed: ${err.message}`);
  }
};

module.exports = logActivity;
