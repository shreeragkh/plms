import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, BookOpen, TrendingUp, Award, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { courseService } from "../services/courseService";
import { teacherAnalyticsService, quizService } from "../services";

const scoreColor = (pct) => {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-yellow-500";
  if (pct >= 40) return "bg-orange-500";
  return "bg-red-500";
};

const scoreBadge = (pct) => {
  if (pct >= 80) return "text-green-400 bg-green-500/10 border-green-500/30";
  if (pct >= 60) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  return "text-red-400 bg-red-500/10 border-red-500/30";
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export default function Analytics() {
  const navigate = useNavigate();

  const [courses,      setCourses]      = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [quizzes,      setQuizzes]      = useState([]);
  const [attempts,     setAttempts]     = useState([]);
  const [students,     setStudents]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState(null); // quizId of expanded row

  // Load teacher's courses
  useEffect(() => {
    courseService.getMyCourses().then((res) => {
      const list = res.courses || [];
      setCourses(list);
      if (list.length > 0) setSelectedCourse(list[0]);
    }).catch(() => setLoading(false));
  }, []);

  // Load data when course changes
  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    setAttempts([]);
    setQuizzes([]);
    setStudents([]);

    Promise.all([
      quizService.getByCourse(selectedCourse._id),
      teacherAnalyticsService.getByCourse(selectedCourse._id),
      courseService.getStudents(selectedCourse._id),
    ]).then(([qRes, aRes, sRes]) => {
      setQuizzes(qRes.quizzes || []);
      setAttempts(aRes.attempts || []);
      setStudents(sRes.students || []);
    }).catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  // ── Derived analytics ─────────────────────────────────────────────────────
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0
    ? Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / totalAttempts)
    : 0;

  // Per-quiz summary
  const quizSummary = quizzes.map((q) => {
    const qa = attempts.filter((a) => (a.quizId?._id || a.quizId) === q._id);
    const avg = qa.length
      ? Math.round(qa.reduce((s, a) => s + (a.percentage || 0), 0) / qa.length)
      : null;
    return { ...q, attemptCount: qa.length, avgScore: avg, attempts: qa };
  });

  // Per-student summary
  const studentSummary = students.map((s) => {
    const sid = s.student?._id || s.student;
    const sa  = attempts.filter((a) => (a.studentId?._id || a.studentId) === sid);
    const avg = sa.length
      ? Math.round(sa.reduce((x, a) => x + (a.percentage || 0), 0) / sa.length)
      : null;
    return {
      _id:      sid,
      name:     s.student?.name  || "Unknown",
      email:    s.student?.email || "",
      dept:     s.student?.department || "",
      year:     s.student?.yearOrSemester || "",
      quizCount: sa.length,
      avgScore: avg,
      lastAttempt: sa.sort((x, y) => new Date(y.submittedAt) - new Date(x.submittedAt))[0]?.submittedAt,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-white">
      <button onClick={() => navigate("/teacher/dashboard")} className="mb-6 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="flex items-center gap-3 mb-6">
        <TrendingUp size={24} className="text-blue-400" />
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>

      {/* Course selector */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <span className="text-slate-400 text-sm">Course:</span>
        <div className="flex gap-2 flex-wrap">
          {courses.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedCourse(c)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCourse?._id === c._id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
          <Loader2 size={24} className="animate-spin" /> Loading analytics...
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard icon={<Users size={18}/>}      label="Enrolled Students" value={students.length}  color="bg-blue-600" />
            <SummaryCard icon={<BookOpen size={18}/>}   label="Total Quizzes"     value={quizzes.length}   color="bg-purple-600" />
            <SummaryCard icon={<TrendingUp size={18}/> } label="Total Attempts"   value={totalAttempts}    color="bg-cyan-600" />
            <SummaryCard icon={<Award size={18}/>}      label="Class Average"     value={avgScore > 0 ? `${avgScore}%` : "N/A"} color="bg-pink-600" />
          </div>

          {/* Quiz performance */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400" /> Quiz Performance
            </h2>

            {quizSummary.length === 0 ? (
              <p className="text-slate-500 text-sm">No quizzes created for this course yet.</p>
            ) : (
              <div className="space-y-3">
                {quizSummary.map((q) => (
                  <div key={q._id}>
                    <div
                      className="bg-slate-700/50 border border-slate-600 p-4 rounded-xl cursor-pointer hover:border-slate-500 transition"
                      onClick={() => setExpanded(expanded === q._id ? null : q._id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <p className="font-medium text-sm truncate">{q.title}</p>
                          {!q.isPublished && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full flex-shrink-0">Draft</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                          <span className="text-xs text-slate-400">{q.attemptCount} attempts</span>
                          {q.avgScore !== null
                            ? <span className={`text-xs px-2 py-0.5 rounded border ${scoreBadge(q.avgScore)}`}>{q.avgScore}% avg</span>
                            : <span className="text-xs text-slate-500">No attempts</span>
                          }
                          {expanded === q._id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                      </div>

                      {q.avgScore !== null && (
                        <div className="w-full bg-slate-600 h-2 rounded-full overflow-hidden mt-1">
                          <div className={`${scoreColor(q.avgScore)} h-full rounded-full transition-all`}
                            style={{ width: `${q.avgScore}%` }} />
                        </div>
                      )}
                    </div>

                    {/* Expanded: per-student breakdown for this quiz */}
                    {expanded === q._id && q.attempts.length > 0 && (
                      <div className="ml-4 mt-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="text-slate-500 border-b border-slate-700">
                            <tr>
                              <th className="text-left p-3 font-medium">Student</th>
                              <th className="text-left p-3 font-medium">Score</th>
                              <th className="text-left p-3 font-medium">Attempt #</th>
                              <th className="text-left p-3 font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {q.attempts
                              .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                              .map((a, i) => (
                                <tr key={i} className="hover:bg-slate-800/50">
                                  <td className="p-3 text-white">{a.studentId?.name || "Student"}</td>
                                  <td className={`p-3 font-bold ${a.percentage >= 60 ? "text-green-400" : "text-red-400"}`}>
                                    {a.percentage}%
                                  </td>
                                  <td className="p-3 text-slate-400">#{a.attemptNumber || 1}</td>
                                  <td className="p-3 text-slate-500">{formatDate(a.submittedAt)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student performance */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users size={18} className="text-purple-400" /> Student Performance
            </h2>

            {studentSummary.length === 0 ? (
              <p className="text-slate-500 text-sm">No students enrolled in this course yet.</p>
            ) : (
              <div className="space-y-3">
                {studentSummary
                  .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1))
                  .map((s) => (
                    <div key={s._id} className="bg-slate-700/50 border border-slate-600 p-4 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-slate-400">
                            {s.email}
                            {s.dept && ` · ${s.dept}`}
                            {s.year && ` · ${s.year}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          {s.avgScore !== null
                            ? <>
                                <span className={`text-sm font-bold px-2 py-0.5 rounded border ${scoreBadge(s.avgScore)}`}>
                                  {s.avgScore}%
                                </span>
                                <p className="text-xs text-slate-500 mt-1">{s.quizCount} quiz{s.quizCount !== 1 ? "zes" : ""} attempted</p>
                              </>
                            : <span className="text-xs text-slate-500">No attempts yet</span>
                          }
                        </div>
                      </div>

                      {s.avgScore !== null && (
                        <div className="w-full bg-slate-600 h-1.5 rounded-full overflow-hidden">
                          <div className={`${scoreColor(s.avgScore)} h-full rounded-full transition-all`}
                            style={{ width: `${s.avgScore}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }) {
  return (
    <div className={`${color} p-4 rounded-xl flex items-center justify-between shadow-lg shadow-black/20`}>
      <div>
        <p className="text-[10px] text-white/70 uppercase font-bold">{label}</p>
        <p className="text-xl font-bold mt-0.5">{value}</p>
      </div>
      <div className="text-white/40">{icon}</div>
    </div>
  );
}
