const Quiz = require("../models/Quiz");
const Course = require("../models/Course");
const logActivity = require("../utils/logActivity");

// @GET /api/v1/quizzes/course/:courseId
const getQuizzesByCourse = async (req, res) => {
  try {
    const filter = { courseId: req.params.courseId };
    if (req.user.role === "student") filter.isPublished = true;

    const quizzes = await Quiz.find(filter)
      .populate("teacherId", "name")
      .select(req.user.role === "student" ? "-questions.correctAnswer" : "")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: quizzes.length, quizzes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/quizzes/:id
const getQuiz = async (req, res) => {
  try {
    let query = Quiz.findById(req.params.id).populate("teacherId", "name");
    if (req.user.role === "student") query = query.select("-questions.correctAnswer");

    const quiz = await query;
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    res.json({ success: true, quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/v1/quizzes — Teacher creates a quiz
const createQuiz = async (req, res) => {
  try {
    const { courseId, title, description, questions, dueDate, timeLimit, isPublished } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized for this course" });
    }

    // Compute totalMarks from questions array
    const totalMarks = (questions || []).reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

    const quiz = await Quiz.create({
      courseId, teacherId: req.user._id,
      title, description, questions,
      totalMarks,
      dueDate, timeLimit,
      isPublished: isPublished || false,
      createdBy: "teacher",
    });

    await logActivity(req.user, "created_quiz", "Quiz", quiz._id, { title, courseId });
    res.status(201).json({ success: true, quiz });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/quizzes/:id
const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    if (quiz.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Re-compute totalMarks if questions are being updated
    if (req.body.questions) {
      req.body.totalMarks = (req.body.questions || []).reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
    }

    const updated = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, quiz: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/quizzes/:id/publish — Toggle publish
const togglePublish = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    if (quiz.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    quiz.isPublished = !quiz.isPublished;
    await quiz.save();

    await logActivity(req.user, quiz.isPublished ? "published_quiz" : "unpublished_quiz", "Quiz", quiz._id);
    res.json({ success: true, message: `Quiz ${quiz.isPublished ? "published" : "unpublished"}`, quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/v1/quizzes/:id
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    if (quiz.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await Quiz.findByIdAndDelete(req.params.id);
    await logActivity(req.user, "deleted_quiz", "Quiz", req.params.id);
    res.json({ success: true, message: "Quiz deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getQuizzesByCourse, getQuiz, createQuiz, updateQuiz, togglePublish, deleteQuiz };
