const express = require("express");
const router = express.Router();
const { submitQuiz, getMyAttempts, getAttemptsByQuiz, getAttemptsByCourse, getAttempt } = require("../controllers/quizAttemptController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { mongoIdParam, validate } = require("../middleware/validators");

router.use(protect);

router.post("/",                          authorize("student"), submitQuiz);
router.get("/my",                         authorize("student"), getMyAttempts);
router.get("/quiz/:quizId",               authorize("teacher", "admin"), mongoIdParam("quizId"), validate, getAttemptsByQuiz);
router.get("/course/:courseId",           authorize("teacher", "admin"), mongoIdParam("courseId"), validate, getAttemptsByCourse);
router.get("/:id",                        mongoIdParam("id"), validate, getAttempt);

module.exports = router;
