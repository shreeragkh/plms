import { useState, useEffect } from "react";
import { courseService } from "../services/courseService";
import { quizService } from "../services";
import { BookOpen, Eye, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

export default function PendingQuizzes() {
  const [quizzes,  setQuizzes]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [message,  setMessage]  = useState("");

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        // Get all teacher's courses then all quizzes across them
        const coursesData = await courseService.getMyCourses();
        const courses = coursesData.courses || [];

        const allQuizzes = [];
        await Promise.all(
          courses.map(async (course) => {
            try {
              const res = await quizService.getByCourse(course._id);
              const quizzesWithCourse = (res.quizzes || []).map((q) => ({
                ...q,
                courseTitle: course.title,
              }));
              allQuizzes.push(...quizzesWithCourse);
            } catch (_) {}
          })
        );

        // Sort newest first
        allQuizzes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setQuizzes(allQuizzes);
      } catch (err) {
        console.error("PendingQuizzes error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const handleTogglePublish = async (quiz) => {
    try {
      await quizService.togglePublish(quiz._id);
      setQuizzes((prev) =>
        prev.map((q) =>
          q._id === quiz._id ? { ...q, isPublished: !q.isPublished } : q
        )
      );
      setMessage(`Quiz "${quiz.title}" ${quiz.isPublished ? "unpublished" : "published"}`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Failed to update quiz status.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg mb-8">
      <h2 className="text-xl font-semibold mb-4">Your Quizzes</h2>

      {message && (
        <div className="bg-blue-500/20 border border-blue-400 text-blue-300 px-4 py-2 rounded-lg mb-4 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-4">
          <Loader2 size={18} className="animate-spin" /> Loading quizzes...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-slate-400 text-sm py-4 flex items-center gap-2">
          <BookOpen size={18} /> No quizzes yet. Create your first quiz above.
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <div
              key={quiz._id}
              className="flex justify-between items-center bg-slate-700/50 border border-slate-600 p-4 rounded-xl"
            >
              <div className="min-w-0 flex-1 mr-4">
                <p className="text-white font-medium truncate">{quiz.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {quiz.courseTitle} &bull; {quiz.questions?.length || 0} questions &bull; {quiz.totalMarks} marks
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Published badge */}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  quiz.isPublished
                    ? "bg-green-500/20 text-green-400 border border-green-500/40"
                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                }`}>
                  {quiz.isPublished ? "Published" : "Draft"}
                </span>

                {/* Toggle publish */}
                <button
                  onClick={() => handleTogglePublish(quiz)}
                  title={quiz.isPublished ? "Unpublish" : "Publish"}
                  className="text-slate-400 hover:text-white transition"
                >
                  {quiz.isPublished
                    ? <ToggleRight size={22} className="text-green-400" />
                    : <ToggleLeft  size={22} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
