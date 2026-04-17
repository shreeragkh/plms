const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const logActivity = require("../utils/logActivity");

// @GET /api/v1/users — Admin: all users with filters
const getAllUsers = async (req, res) => {
  try {
    const { role, search, isActive, isApproved, department } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (department) filter.department = { $regex: department, $options: "i" };
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (isApproved !== undefined) filter.isApproved = isApproved === "true";
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/users/:id
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/users/:id/toggle-status — Admin: activate / deactivate
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot deactivate your own account" });
    }

    user.isActive = !user.isActive;
    await user.save();

    await logActivity(req.user, user.isActive ? "activated_user" : "deactivated_user", "User", user._id);
    res.json({ success: true, message: `User ${user.isActive ? "activated" : "deactivated"}`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/users/:id/role — Admin: change role
const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await logActivity(req.user, "changed_user_role", "User", user._id, { newRole: role });
    res.json({ success: true, message: "Role updated", user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @DELETE /api/v1/users/:id — Admin: delete user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot delete yourself" });
    }

    await User.findByIdAndDelete(req.params.id);
    await Enrollment.deleteMany({ studentId: req.params.id });
    await logActivity(req.user, "deleted_user", "User", req.params.id, { name: user.name });

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/users/teacher/students
// Teacher: all unique students enrolled in any of their courses
const getTeacherStudents = async (req, res) => {
  try {
    const courses = await Course.find({ teacherId: req.user._id }, "_id title");
    const courseIds = courses.map((c) => c._id);

    const enrollments = await Enrollment.find({ courseId: { $in: courseIds } })
      .populate("studentId", "name email department yearOrSemester createdAt")
      .populate("courseId", "title category");

    // Group by student, attach all their enrolled courses
    const studentMap = {};
    enrollments.forEach((e) => {
      if (!e.studentId) return;
      const sid = e.studentId._id.toString();
      if (!studentMap[sid]) {
        studentMap[sid] = { student: e.studentId, enrolledCourses: [] };
      }
      studentMap[sid].enrolledCourses.push({
        courseId:    e.courseId._id,
        courseTitle: e.courseId.title,
        enrolledAt:  e.enrolledAt,
        status:      e.status,
      });
    });

    res.json({
      success: true,
      count: Object.keys(studentMap).length,
      students: Object.values(studentMap),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// @GET /api/v1/users/admin/stats — Admin: platform-wide stats
const getAdminStats = async (req, res) => {
  try {
    const Quiz        = require("../models/Quiz");
    const QuizAttempt = require("../models/QuizAttempt");

    const [students, teachers, totalQuizzes, avgResult] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      Quiz.countDocuments(),
      QuizAttempt.aggregate([
        { $group: { _id: null, avg: { $avg: "$percentage" } } }
      ]),
    ]);

    const avgScore = avgResult.length > 0
      ? Math.round(avgResult[0].avg)
      : 0;

    res.json({ success: true, stats: { students, teachers, totalQuizzes, avgScore } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/users/admin/recent-logins — Recent logins by role
const getRecentLogins = async (req, res) => {
  try {
    const ActivityLog = require("../models/ActivityLog");
    const { role } = req.query;

    const filter = { action: "logged_in" };
    if (role) filter.role = role;

    const logs = await ActivityLog.find(filter)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .limit(5);

    // Deduplicate by userId — keep only latest login per user
    const seen = new Set();
    const unique = logs.filter(l => {
      const id = l.userId?._id?.toString();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    res.json({ success: true, logins: unique });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/users/:id/approve — Admin approves a pending user
const approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.isApproved = true;
    await user.save();

    await logActivity(req.user, "approved_user", "User", user._id, { name: user.name, role: user.role });

    res.json({ success: true, message: `${user.name} approved successfully`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


module.exports = {
  getAllUsers, getUser,
  toggleUserStatus, changeUserRole, deleteUser,
  getTeacherStudents, getAdminStats, getRecentLogins, approveUser,
};
