const express = require("express");
const router = express.Router();
const { submitAssignment, getMySubmissions, getSubmissionsByAssignment, gradeSubmission } = require("../controllers/assignmentSubmissionController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");
const { uploadLimiter } = require("../middleware/rateLimiter");
const { mongoIdParam, validate } = require("../middleware/validators");

router.use(protect);

router.post("/submit",                          authorize("student"), uploadLimiter, upload.single("file"), submitAssignment);
router.get("/my",                               authorize("student"), getMySubmissions);
router.get("/assignment/:assignmentId",          authorize("teacher", "admin"), mongoIdParam("assignmentId"), validate, getSubmissionsByAssignment);
router.put("/:id/grade",                        authorize("teacher", "admin"), mongoIdParam("id"), validate, gradeSubmission);

module.exports = router;
