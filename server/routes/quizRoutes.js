const express = require("express");
const router = express.Router();
const { getQuizzesByCourse, getQuiz, createQuiz, updateQuiz, togglePublish, deleteQuiz } = require("../controllers/quizController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { quizRules, mongoIdParam, validate } = require("../middleware/validators");

router.use(protect);

router.get("/course/:courseId", mongoIdParam("courseId"), validate, getQuizzesByCourse);
router.post("/",                authorize("teacher", "admin"), quizRules, validate, createQuiz);
router.route("/:id")
  .get(mongoIdParam("id"),    validate, getQuiz)
  .put(authorize("teacher", "admin"), mongoIdParam("id"), validate, updateQuiz)
  .delete(authorize("teacher", "admin"), mongoIdParam("id"), validate, deleteQuiz);
router.put("/:id/publish",      authorize("teacher", "admin"), mongoIdParam("id"), validate, togglePublish);

module.exports = router;
