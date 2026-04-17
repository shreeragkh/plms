const { body, param, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Auth ──────────────────────────────────────────────────────────────────────
const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2, max: 50 }),
  body("email").trim().isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password min 6 characters"),
  body("role").optional().isIn(["student", "teacher", "admin"]).withMessage("Invalid role"),
];

const loginRules = [
  body("email").trim().isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// ── Course ────────────────────────────────────────────────────────────────────
const courseRules = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 100 }),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("startDate").isISO8601().withMessage("Valid start date required"),
  body("endDate").isISO8601().withMessage("Valid end date required"),
];

// ── Quiz ──────────────────────────────────────────────────────────────────────
const quizRules = [
  body("title").trim().notEmpty().withMessage("Quiz title is required"),
  body("courseId").isMongoId().withMessage("Valid course ID required"),
  body("questions").isArray({ min: 1 }).withMessage("At least one question required"),
  body("questions.*.question").trim().notEmpty().withMessage("Question text required"),
  body("questions.*.options").isArray({ min: 2 }).withMessage("At least 2 options per question"),
  body("questions.*.correctAnswer").trim().notEmpty().withMessage("Correct answer required"),
  body("isPublished").optional().isBoolean().withMessage("isPublished must be a boolean"),
];

// ── Quiz Attempt ──────────────────────────────────────────────────────────────
const quizAttemptRules = [
  body("quizId").isMongoId().withMessage("Valid quiz ID required"),
  body("answers").isArray({ min: 1 }).withMessage("Answers required"),
  body("answers.*.questionId").isMongoId().withMessage("Valid question ID required"),
  body("answers.*.selectedAnswer").notEmpty().withMessage("Selected answer required"),
];

// ── Enrollment ────────────────────────────────────────────────────────────────
const enrollmentRules = [
  body("courseId").isMongoId().withMessage("Valid course ID required"),
];

// ── Assignment ────────────────────────────────────────────────────────────────
const assignmentRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("courseId").isMongoId().withMessage("Valid course ID required"),
  body("dueDate").isISO8601().withMessage("Valid due date required"),
  body("totalMarks").isInt({ min: 1 }).withMessage("Total marks must be at least 1"),
];

// ── MongoID param ─────────────────────────────────────────────────────────────
const mongoIdParam = (name = "id") => [
  param(name).isMongoId().withMessage(`Invalid ${name}`),
];

module.exports = {
  validate,
  registerRules, loginRules,
  courseRules, quizRules, quizAttemptRules,
  enrollmentRules, assignmentRules,
  mongoIdParam,
};
