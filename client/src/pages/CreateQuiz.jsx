import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { quizService } from "../services";
import { courseService } from "../services/courseService";
import { Loader2, PlusCircle, Trash2, CheckCircle } from "lucide-react";

export default function CreateQuiz() {
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [courses,   setCourses]   = useState([]);
  const [courseId,  setCourseId]  = useState("");
  const [title,     setTitle]     = useState("");
  const [description, setDesc]    = useState("");
  const [timeLimit,    setTimeLimit]    = useState(0);
  const [publishNow,   setPublishNow]   = useState(true); // publish immediately by default
  const [questions, setQuestions] = useState([
    { question: "", options: ["", "", "", ""], correctAnswer: "", marks: 1 }
  ]);
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState("");

  // Load teacher's courses for the dropdown
  useEffect(() => {
    courseService.getMyCourses()
      .then((data) => {
        setCourses(data.courses || []);
        if (data.courses?.length > 0) setCourseId(data.courses[0]._id);
      })
      .catch(() => setError("Could not load your courses."));
  }, []);

  const addQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctAnswer: "", marks: 1 }]);
  };

  const deleteQuestion = (idx) => {
    if (questions.length === 1) return; // keep at least one
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, field, value, optionIdx = null) => {
    const updated = [...questions];
    if (field === "option") {
      updated[idx].options[optionIdx] = value;
    } else {
      updated[idx][field] = value;
    }
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    setError("");

    // Validation
    if (!courseId)    return setError("Please select a course.");
    if (!title.trim()) return setError("Quiz title is required.");
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim())       return setError(`Question ${i + 1} text is required.`);
      if (q.options.some(o => !o.trim())) return setError(`All options for Question ${i + 1} must be filled.`);
      if (!q.correctAnswer.trim())  return setError(`Correct answer for Question ${i + 1} is required.`);
      if (!q.options.includes(q.correctAnswer.trim()))
        return setError(`Correct answer for Question ${i + 1} must exactly match one of the options.`);
    }

    setLoading(true);
    try {
      await quizService.create({
        courseId,
        title,
        description,
        timeLimit: Number(timeLimit),
        isPublished: publishNow,
        questions: questions.map((q) => ({
          question:      q.question,
          options:       q.options.filter(Boolean),
          correctAnswer: q.correctAnswer,
          marks:         Number(q.marks) || 1,
        })),
      });

      setSuccess(true);
      setTimeout(() => navigate("/teacher/dashboard"), 1800);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create quiz.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <CheckCircle size={64} className="text-green-400 mx-auto" />
          <h2 className="text-2xl font-bold">Quiz Created!</h2>
          <p className="text-slate-400">Redirecting back to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-white">
      <button onClick={() => navigate("/teacher/dashboard")} className="mb-6 text-blue-400 hover:text-blue-300">
        ← Back to Dashboard
      </button>

      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Create New Quiz</h1>

        {/* Quiz details */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Course *</label>
            {courses.length === 0
              ? <p className="text-yellow-400 text-sm">No courses found. Create a course first.</p>
              : <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
            }
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Quiz Title *</label>
            <input
              type="text"
              placeholder="e.g. JavaScript Fundamentals Quiz"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Description</label>
            <textarea
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Time Limit (minutes) — 0 = unlimited</label>
            <input
              type="number"
              min={0}
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg"
            />
          </div>
        </div>

        {/* Questions */}
        {questions.map((q, idx) => (
          <div key={idx} className="relative bg-slate-800 border border-slate-700 p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Question {idx + 1}</h2>
              {questions.length > 1 && (
                <button onClick={() => deleteQuestion(idx)} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm">
                  <Trash2 size={15} /> Remove
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Write your question here"
              value={q.question}
              onChange={(e) => updateQuestion(idx, "question", e.target.value)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg"
            />

            <div className="grid md:grid-cols-2 gap-3">
              {q.options.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => updateQuestion(idx, "option", e.target.value, i)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg"
                />
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Correct Answer (must match an option exactly)</label>
                <input
                  type="text"
                  placeholder="e.g. Option 2 text"
                  value={q.correctAnswer}
                  onChange={(e) => updateQuestion(idx, "correctAnswer", e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-green-600/50 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Marks for this question</label>
                <input
                  type="number"
                  min={1}
                  value={q.marks}
                  onChange={(e) => updateQuestion(idx, "marks", e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Publish toggle */}
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Publish immediately</p>
            <p className="text-xs text-slate-400 mt-0.5">Students can only see and attempt published quizzes</p>
          </div>
          <button
            type="button"
            onClick={() => setPublishNow(v => !v)}
            className={`w-12 h-6 rounded-full transition-colors relative ${publishNow ? 'bg-blue-600' : 'bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${publishNow ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4 pb-10">
          <button
            onClick={addQuestion}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg transition"
          >
            <PlusCircle size={18} /> Add Question
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || courses.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-3 rounded-lg font-semibold hover:scale-105 transition disabled:opacity-60"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : "Save Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
