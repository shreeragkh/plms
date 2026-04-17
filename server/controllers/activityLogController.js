const ActivityLog = require("../models/ActivityLog");

// @GET /api/v1/activity-logs — Admin: all logs with filters
const getAllLogs = async (req, res) => {
  try {
    const { role, action, entityType, userId, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (role)       filter.role       = role;
    if (action)     filter.action     = { $regex: action, $options: "i" };
    if (entityType) filter.entityType = entityType;
    if (userId)     filter.userId     = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ActivityLog.countDocuments(filter);

    const logs = await ActivityLog.find(filter)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      count: logs.length,
      logs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/activity-logs/user/:userId — Logs for one user
const getUserLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/activity-logs/summary — Admin dashboard summary stats
const getSummary = async (req, res) => {
  try {
    const [
      totalLogs,
      enrollments,
      quizSubmissions,
      materialsUploaded,
      coursesCreated,
      assignmentSubmissions,
    ] = await Promise.all([
      ActivityLog.countDocuments(),
      ActivityLog.countDocuments({ action: "enrolled_course" }),
      ActivityLog.countDocuments({ action: "submitted_quiz" }),
      ActivityLog.countDocuments({ action: "uploaded_material" }),
      ActivityLog.countDocuments({ action: "created_course" }),
      ActivityLog.countDocuments({ action: "submitted_assignment" }),
    ]);

    // Last 10 actions for the live feed
    const recentActivity = await ActivityLog.find()
      .populate("userId", "name role")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      summary: {
        totalLogs,
        enrollments,
        quizSubmissions,
        materialsUploaded,
        coursesCreated,
        assignmentSubmissions,
      },
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllLogs, getUserLogs, getSummary };

// Not adding here — admin stats handled in userController
