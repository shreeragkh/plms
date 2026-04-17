import { useState, useEffect } from "react";
import { courseService } from "../services/courseService";
import { teacherAnalyticsService } from "../services";
import { Loader2, TrendingUp } from "lucide-react";

const scoreColor = (pct) => {
  if (pct >= 80) return "text-green-400";
  if (pct >= 60) return "text-yellow-400";
  return "text-red-400";
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function ActivityTable() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const coursesRes = await courseService.getMyCourses();
        const courses    = coursesRes.courses || [];

        const allAttempts = [];
        await Promise.all(
          courses.map(async (course) => {
            try {
              const res = await teacherAnalyticsService.getByCourse(course._id);
              (res.attempts || []).forEach((a) => {
                allAttempts.push({
                  studentName: a.studentId?.name  || "Unknown",
                  quizTitle:   a.quizId?.title    || "Quiz",
                  score:       a.percentage       ?? 0,
                  date:        a.submittedAt,
                  courseTitle: course.title,
                });
              });
            } catch (_) {}
          })
        );

        // Sort newest first, take latest 10
        allAttempts.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRows(allAttempts.slice(0, 10));
      } catch (err) {
        console.error("ActivityTable error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp size={18} className="text-blue-400" />
        <h2 className="text-white font-semibold">Recent Student Activity</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-6 justify-center">
          <Loader2 size={18} className="animate-spin" /> Loading activity...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-slate-500 text-sm py-6 text-center">
          No quiz attempts yet. Students will appear here once they attempt quizzes.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-slate-400 border-b border-slate-700">
            <tr>
              <th className="text-left py-2 font-medium">Student</th>
              <th className="text-left py-2 font-medium">Quiz</th>
              <th className="text-left py-2 font-medium">Course</th>
              <th className="text-left py-2 font-medium">Score</th>
              <th className="text-left py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-800/40 transition">
                <td className="py-3 text-white font-medium">{r.studentName}</td>
                <td className="py-3 text-slate-300 max-w-[160px] truncate">{r.quizTitle}</td>
                <td className="py-3 text-slate-400 text-xs max-w-[120px] truncate">{r.courseTitle}</td>
                <td className={`py-3 font-bold ${scoreColor(r.score)}`}>{r.score}%</td>
                <td className="py-3 text-slate-500 text-xs">{formatDate(r.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
