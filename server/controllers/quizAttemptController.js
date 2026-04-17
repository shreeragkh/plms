const QuizAttempt = require("../models/QuizAttempt");
const Quiz = require("../models/Quiz");
const logActivity = require("../utils/logActivity");

// @POST /api/v1/quiz-attempts — Student submits, auto-graded
const submitQuiz = async (req, res) => {
  try {
    const { quizId, answers, timeTaken } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz)            return res.status(404).json({ success: false, message: "Quiz not found" });
    if (!quiz.isPublished) return res.status(400).json({ success: false, message: "Quiz is not available" });

    // Count previous attempts (allows re-attempts)
    const previousAttempts = await QuizAttempt.countDocuments({ quizId, studentId: req.user._id });
    const attemptNumber = previousAttempts + 1;

    // ── Auto-grade using flexible [Object] questions ──────────────────────────
    let totalMarks  = quiz.totalMarks || quiz.questions.length;
    let earnedMarks = 0;

    const gradedAnswers = answers.map((studentAns, idx) => {
      // Match by _id first, fall back to index position
      let question = quiz.questions.find(
        (q) => q._id && q._id.toString() === studentAns.questionId?.toString()
      );
      // If _id matching failed (stored as [Object] without subdoc _id), use index
      if (!question) {
        question = quiz.questions[idx];
      }

      const isCorrect = question
        ? (studentAns.selectedAnswer || '').trim().toLowerCase() ===
          (question.correctAnswer || '').trim().toLowerCase()
        : false;

      const marksEarned = isCorrect ? (question?.marks || 1) : 0;
      earnedMarks += marksEarned;

      return { ...studentAns, isCorrect, marksEarned };
    });

    const percentage = totalMarks > 0
      ? Math.round((earnedMarks / totalMarks) * 100)
      : 0;

    // Auto-feedback
    let feedback = "";
    if (percentage >= 80)      feedback = "Excellent! Strong grasp of the topic.";
    else if (percentage >= 60) feedback = "Good effort! Review the questions you missed.";
    else if (percentage >= 40) feedback = "Keep practising. Focus on weak areas.";
    else                        feedback = "Revisit the course materials and try again.";

    const attempt = await QuizAttempt.create({
      quizId,
      courseId:     quiz.courseId,
      studentId:    req.user._id,
      answers:      gradedAnswers,
      score:        earnedMarks,
      percentage,
      feedback,
      timeTaken:    timeTaken || 0,
      attemptNumber,
    });

    await logActivity(req.user, "submitted_quiz", "quiz", quizId,
      `Score: ${earnedMarks}/${totalMarks} (${percentage}%) — Attempt #${attemptNumber}`
    );

    res.status(201).json({
      success: true,
      message: "Quiz submitted successfully",
      result: {
        score:          earnedMarks,
        totalMarks,
        percentage,
        feedback,
        attemptNumber,
        correctAnswers: gradedAnswers.filter((a) => a.isCorrect).length,
        totalQuestions: quiz.questions.length,
        attemptId:      attempt._id,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/quiz-attempts/my
const getMyAttempts = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ studentId: req.user._id })
      .populate("quizId",   "title totalMarks")
      .populate("courseId", "title")
      .sort({ submittedAt: -1 });

    res.json({ success: true, count: attempts.length, attempts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/quiz-attempts/quiz/:quizId — Teacher: all results for a quiz
const getAttemptsByQuiz = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ quizId: req.params.quizId })
      .populate("studentId", "name email department yearOrSemester")
      .select("-answers")
      .sort({ percentage: -1 });

    const scores = attempts.map((a) => a.percentage);
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    res.json({
      success: true,
      count: attempts.length,
      analytics: {
        averageScore:  avg,
        highestScore:  scores.length ? Math.max(...scores) : 0,
        lowestScore:   scores.length ? Math.min(...scores) : 0,
        totalAttempts: attempts.length,
        passCount:     scores.filter((s) => s >= 40).length,
      },
      attempts,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/quiz-attempts/course/:courseId
const getAttemptsByCourse = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ courseId: req.params.courseId })
      .populate("studentId", "name email")
      .populate("quizId",    "title totalMarks")
      .sort({ submittedAt: -1 });

    res.json({ success: true, count: attempts.length, attempts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/quiz-attempts/:id — Single attempt detail
const getAttempt = async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.id)
      .populate("quizId")
      .populate("studentId", "name email")
      .populate("courseId",  "title");

    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });

    const isOwner = attempt.studentId._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role === "student") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, attempt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { submitQuiz, getMyAttempts, getAttemptsByQuiz, getAttemptsByCourse, getAttempt };
