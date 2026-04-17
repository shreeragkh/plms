const express = require("express");
const router = express.Router();
const { getAllUsers, getUser, toggleUserStatus, changeUserRole, deleteUser, getTeacherStudents, getAdminStats, getRecentLogins, approveUser } = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { mongoIdParam, validate } = require("../middleware/validators");

router.use(protect);

router.get("/teacher/students",    authorize("teacher", "admin"), getTeacherStudents);
router.get("/",                    authorize("admin"), getAllUsers);
router.get("/:id",                 authorize("admin", "teacher"), mongoIdParam("id"), validate, getUser);
router.put("/:id/toggle-status",   authorize("admin"), mongoIdParam("id"), validate, toggleUserStatus);
router.put("/:id/role",            authorize("admin"), mongoIdParam("id"), validate, changeUserRole);
router.delete("/:id",              authorize("admin"), mongoIdParam("id"), validate, deleteUser);

router.get("/admin/stats",          authorize("admin"), getAdminStats);
router.put("/:id/approve",           authorize("admin"), mongoIdParam("id"), validate, approveUser);
router.get("/admin/recent-logins",   authorize("admin"), getRecentLogins);

module.exports = router;
