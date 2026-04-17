const express = require("express");
const router = express.Router();
const { enrollInCourse, getMyEnrollments, getEnrollmentsByCourse, updateEnrollmentStatus, unenroll } = require("../controllers/enrollmentController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { enrollmentRules, mongoIdParam, validate } = require("../middleware/validators");

router.use(protect);

router.post("/",                               authorize("student"), enrollmentRules, validate, enrollInCourse);
router.get("/my",                              authorize("student"), getMyEnrollments);
router.get("/course/:courseId",                authorize("teacher", "admin"), mongoIdParam("courseId"), validate, getEnrollmentsByCourse);
router.put("/:id/status",                      mongoIdParam("id"), validate, updateEnrollmentStatus);
router.delete("/:id",                          mongoIdParam("id"), validate, unenroll);

module.exports = router;
