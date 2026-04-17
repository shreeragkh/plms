import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Bell, LogOut, Target, FileText,
  Award, TrendingUp, Clock, Loader2, PlayCircle, RotateCcw, BookMarked, Search,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { quizAttemptService, enrollmentService, quizService, assignmentService, assignmentSubmissionService } from '../services';

const COLORS = ['#3b82f6', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

const scoreColor = (pct) => {
  if (pct >= 80) return 'text-green-400';
  if (pct >= 60) return 'text-yellow-400';
  return 'text-pink-400';
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
});

const last7Days = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { day: days[d.getDay()], date: d.toDateString() };
  });
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading,      setLoading]      = useState(true);
  const [attempts,     setAttempts]     = useState([]);
  const [enrollments,  setEnrollments]  = useState([]);
  const [pendingCount,      setPendingCount]      = useState(0);
  const [pendingQuizzesList, setPendingQuizzesList] = useState([]);
  const [assignments,       setAssignments]       = useState([]);
  const [submissions,       setSubmissions]       = useState([]);
  const [submittingId,      setSubmittingId]      = useState(null); // assignmentId
  const [uploadFile,        setUploadFile]        = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [attemptsRes, enrollRes] = await Promise.all([
          quizAttemptService.getMyAttempts(),
          enrollmentService.getMyEnrollments(),
        ]);

        const myAttempts    = attemptsRes.attempts   || [];
        const myEnrollments = enrollRes.enrollments  || [];

        setAttempts(myAttempts);
        setEnrollments(myEnrollments);

        // Fetch assignments and submissions
        const [assignRes, subRes] = await Promise.all([
          Promise.all(myEnrollments.filter(e => e.courseId).map(e => assignmentService.getByCourse(e.courseId._id))),
          assignmentSubmissionService.getMySubmissions()
        ]);

        const allAssignments = assignRes.flatMap(r => r.assignments || []);
        const mySubmissions  = subRes.submissions || [];

        setAssignments(allAssignments);
        setSubmissions(mySubmissions);

        // Count pending
        const attemptedIds = new Set(myAttempts.map((a) => a.quizId?._id || a.quizId));
        const submittedAssignIds = new Set(mySubmissions.map(s => s.assignmentId?._id || s.assignmentId));

        let qPending = 0;
        let pQuizzes = [];
        await Promise.all(
          myEnrollments.filter(e => e.courseId).map(async (en) => {
            try {
              const qRes = await quizService.getByCourse(en.courseId._id);
              const quizzes = qRes.quizzes || [];
              const pendingOnes = quizzes.filter((q) => !attemptedIds.has(q._id));
              qPending += pendingOnes.length;
              pQuizzes = [...pQuizzes, ...pendingOnes];
            } catch (_) {}
          })
        );
        setPendingCount(qPending);
        setPendingQuizzesList(pQuizzes);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSubmitAssignment = async (assignmentId) => {
    if (!uploadFile) return alert("Please select a file first.");
    setSubmittingId(assignmentId);
    try {
      await assignmentSubmissionService.submit(assignmentId, uploadFile);
      const subRes = await assignmentSubmissionService.getMySubmissions();
      setSubmissions(subRes.submissions || []);
      setSubmittingId(null);
      setUploadFile(null);
      alert("Assignment submitted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed.");
      setSubmittingId(null);
    }
  };

  // Quizzes that are in-progress (answers saved in localStorage but not submitted)
  const inProgressQuizzes = pendingQuizzesList.filter((q) => {
    try {
      const saved = localStorage.getItem(`quiz_progress_${q._id}`);
      return saved && Object.keys(JSON.parse(saved)).length > 0;
    } catch (_) { return false; }
  });

  // Derived stats
  const quizzesCompleted = attempts.length;
  const avgScore = quizzesCompleted > 0
    ? Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / quizzesCompleted)
    : 0;
  const overallProgress = avgScore;

  const recentAttempts = [...attempts]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 5);

  // Weekly chart — avg score per day for last 7 days
  const dayLabels = last7Days();
  const weeklyData = dayLabels.map(({ day, date }) => {
    const dayAttempts = attempts.filter(
      (a) => new Date(a.submittedAt).toDateString() === date
    );
    const avg = dayAttempts.length
      ? Math.round(dayAttempts.reduce((s, a) => s + a.percentage, 0) / dayAttempts.length)
      : null;
    return { day, score: avg };
  });

  // Subject pie — avg score per course
  const subjectMap = {};
  attempts.forEach((a) => {
    const name = a.courseId?.title || 'Unknown';
    if (!subjectMap[name]) subjectMap[name] = { total: 0, count: 0 };
    subjectMap[name].total += a.percentage || 0;
    subjectMap[name].count += 1;
  });
  const subjectData = Object.entries(subjectMap).map(([name, { total, count }], i) => ({
    name: name.length > 18 ? name.slice(0, 18) + '...' : name,
    value: Math.round(total / count),
    color: COLORS[i % COLORS.length],
  }));

  // Weak topics — attempts below 60%
  const weakTopics = recentAttempts
    .filter((a) => (a.percentage || 0) < 60)
    .slice(0, 3)
    .map((a) => ({
      label: a.quizId?.title || 'Quiz',
      sub:   a.courseId?.title || '',
      val:   a.percentage || 0,
    }));

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6 font-sans flex justify-center">
      <div className="w-full max-w-[1100px]">

        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg"><BookOpen size={20} /></div>
            <div>
              <h1 className="text-lg font-bold">Student Portal</h1>
              <p className="text-gray-400 text-xs">Welcome back, {user?.name || 'Student'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Bell size={18} className="text-gray-400" />
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-1 text-gray-400 text-sm hover:text-white transition"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {/* Enrolled courses + browse button */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            {enrollments.length > 0 && (
              <>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <BookMarked size={12} /> Enrolled:
                </span>
                {enrollments.map((e) => (
                  <span key={e._id} className="text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded-full">
                    {e.courseId?.title || 'Course'}
                  </span>
                ))}
              </>
            )}
          </div>
          <button
            onClick={() => navigate('/browse-courses')}
            className="flex items-center gap-2 bg-[#1e293b] border border-gray-700 hover:border-blue-500/50 px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            <Search size={14} className="text-blue-400" />
            Browse &amp; Enroll in Courses
          </button>
        </div>

        {enrollments.length === 0 && !loading && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-blue-300">You're not enrolled in any courses yet</p>
              <p className="text-sm text-slate-400 mt-1">Enroll in a course to see quizzes, materials and track your progress.</p>
            </div>
            <button
              onClick={() => navigate('/browse-courses')}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl text-sm font-bold transition"
            >
              Browse Courses
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin" />
            <span>Loading your dashboard...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard label="Overall Progress"  value={`${overallProgress}%`} icon={<TrendingUp size={18}/>} color="bg-blue-600" />
              <StatCard label="Quizzes Done"      value={quizzesCompleted}      icon={<Award size={18}/>}     color="bg-purple-600" />
              <StatCard label="Average Score"     value={`${avgScore}%`}        icon={<Target size={18}/>}    color="bg-pink-600" />
              <StatCard label="Pending Quizzes"   value={pendingCount}          icon={<Clock size={18}/>}     color="bg-red-600" />
              <StatCard label="Assignments"       value={assignments.length}    icon={<FileText size={18}/>}  color="bg-orange-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 space-y-6">

                <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-semibold mb-6">Your Progress This Week</h3>
                  {weeklyData.every((d) => d.score === null) ? (
                    <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">
                      No quiz attempts this week yet.
                    </div>
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }}
                            formatter={(v) => v !== null ? [`${v}%`, 'Avg Score'] : ['No attempts', '']}
                          />
                          <Line
                            type="monotone" dataKey="score"
                            stroke="#3b82f6" strokeWidth={3}
                            dot={{ fill: '#3b82f6', r: 5 }}
                            connectNulls={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-orange-400" /> Active Assignments
                  </h3>
                  {assignments.length === 0 ? (
                    <p className="text-slate-500 text-sm py-2">No assignments posted yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map((a) => {
                        const submission = submissions.find(s => (s.assignmentId?._id || s.assignmentId) === a._id);
                        const now = new Date();
                        const isNotStarted = a.startDate ? (now < new Date(a.startDate)) : false;
                        const isPastDue = now > new Date(a.dueDate);
                        
                        let statusLabel = "Pending";
                        let statusColor = "bg-slate-700 text-slate-400 border-slate-600";
                        
                        if (submission) {
                          statusLabel = submission.status === 'reviewed' ? 'Graded' : 'Submitted';
                          statusColor = submission.status === 'reviewed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                        } else if (isNotStarted) {
                          statusLabel = "Not Started";
                          statusColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
                        } else if (isPastDue) {
                          statusLabel = "Expired";
                          statusColor = "bg-red-500/10 text-red-500 border-red-500/20";
                        }

                        return (
                          <div key={a._id} className={`bg-[#0f172a] p-4 rounded-xl border transition ${isNotStarted ? 'opacity-60 grayscale-[0.3]' : 'border-gray-800/50'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-bold">{a.title}</p>
                                <p className="text-[10px] text-slate-500">{a.courseId?.title}</p>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-400 line-clamp-2 mb-3">{a.description}</p>
                            
                            <div className="flex flex-col gap-1.5 text-[10px]">
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock size={12} className={isNotStarted ? "text-yellow-500" : "text-slate-500"} /> 
                                {isNotStarted ? `Opens: ${formatDate(a.startDate)}` : `Starts: ${formatDate(a.startDate)}`}
                              </span>
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock size={12} className={isPastDue ? "text-red-500" : "text-blue-500"} /> 
                                Due: {formatDate(a.dueDate)}
                              </span>
                              {submission?.status === 'reviewed' ? (
                                <span className="text-green-400 font-bold mt-1">Grade: {submission.marks} / {a.totalMarks}</span>
                              ) : (
                                <span className="text-slate-500 mt-1">Max: {a.totalMarks} pts</span>
                              )}
                            </div>

                            {/* Submission UI — Only show if not submitted, started, and not past due */}
                            {!submission && !isNotStarted && !isPastDue && (
                              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2">
                                <input 
                                  type="file" 
                                  id={`file-${a._id}`}
                                  className="hidden" 
                                  onChange={(e) => setUploadFile(e.target.files[0])}
                                />
                                <label 
                                  htmlFor={`file-${a._id}`}
                                  className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2 px-3 rounded-lg text-[10px] flex items-center gap-2 transition"
                                >
                                  {uploadFile && submittingId === null ? <span className="text-blue-400 truncate max-w-[120px]">{uploadFile.name}</span> : <><PlayCircle size={14}/> Select File</>}
                                </label>
                                <button
                                  onClick={() => handleSubmitAssignment(a._id)}
                                  disabled={submittingId === a._id}
                                  className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-[10px] font-bold transition disabled:opacity-50"
                                >
                                  {submittingId === a._id ? <Loader2 size={12} className="animate-spin" /> : 'Submit'}
                                </button>
                              </div>
                            )}

                            {isNotStarted && !submission && (
                              <div className="mt-4 p-2 bg-yellow-500/10 rounded border border-yellow-500/20 text-[9px] text-yellow-500 flex items-center gap-2">
                                <Clock size={12} /> Submission opens on {formatDate(a.startDate)}
                              </div>
                            )}

                            {isPastDue && !submission && (
                              <div className="mt-4 p-2 bg-red-500/10 rounded border border-red-500/20 text-[9px] text-red-400 flex items-center gap-2 font-medium">
                                <RotateCcw size={12} /> Deadline has passed. Submissions are closed.
                              </div>
                            )}

                            {submission?.feedback && (
                              <div className="mt-3 p-2 bg-blue-500/5 rounded border border-blue-500/10 text-[10px] text-blue-300">
                                <span className="font-bold">Feedback:</span> {submission.feedback}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-semibold mb-4">Recent Quiz Performance</h3>
                  {recentAttempts.length === 0 ? (
                    <p className="text-slate-500 text-sm py-2">No quizzes attempted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentAttempts.map((a) => (
                        <QuizItem
                          key={a._id}
                          title={a.quizId?.title || 'Quiz'}
                          date={formatDate(a.submittedAt)}
                          score={a.percentage}
                          color={scoreColor(a.percentage)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-semibold mb-4 text-orange-400">Topics to Improve</h3>
                  {weakTopics.length === 0 ? (
                    <p className="text-slate-500 text-sm mb-4">
                      {quizzesCompleted === 0
                        ? 'Attempt some quizzes to see improvement areas.'
                        : 'Great job! No weak topics found.'}
                    </p>
                  ) : (
                    <div className="space-y-4 mb-4">
                      {weakTopics.map((t, i) => (
                        <ProgressItem
                          key={i} label={t.label} sub={t.sub} val={t.val}
                          color={t.val < 40 ? 'bg-red-500' : 'bg-orange-500'}
                        />
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/recommendations')}
                    className="w-full bg-cyan-600 py-2.5 rounded-lg text-xs font-bold hover:bg-cyan-500 transition mt-2"
                  >
                    Get Personalized Recommendations
                  </button>
                </div>

              </div>
            </div>

            <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800">
              <h3 className="text-sm font-semibold mb-4">Performance by Subject</h3>
              {subjectData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
                  Complete some quizzes to see your subject performance.
                </div>
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subjectData}
                        cx="50%" cy="50%"
                        outerRadius={85}
                        dataKey="value"
                        stroke="none"
                        label={({ name, value, x, y, fill }) => (
                          <text
                            x={x} y={y} fill={fill}
                            textAnchor={x > 400 ? 'start' : 'end'}
                            dominantBaseline="central"
                            style={{ fontSize: 11, fontWeight: 600 }}
                          >
                            {`${name}: ${value}%`}
                          </text>
                        )}
                      >
                        {subjectData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }) => (
  <div className={`${color} p-4 rounded-xl flex items-center justify-between shadow-lg shadow-black/20`}>
    <div>
      <p className="text-[10px] text-white/70 uppercase font-bold">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
    <div className="text-white/40">{icon}</div>
  </div>
);

const QuizItem = ({ title, date, score, color }) => (
  <div className="flex justify-between items-center bg-[#0f172a] p-3 rounded-lg border border-gray-800/50">
    <div>
      <p className="text-xs font-bold">{title}</p>
      <p className="text-[10px] text-gray-500">{date}</p>
    </div>
    <p className={`text-sm font-bold ${color}`}>{score}%</p>
  </div>
);

const ProgressItem = ({ label, sub, val, color }) => (
  <div>
    <div className="flex justify-between text-[10px] mb-1">
      <span>
        {label}
        <span className="text-gray-500 block text-[8px]">{sub}</span>
      </span>
      <span>{val}%</span>
    </div>
    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
      <div className={`${color} h-full`} style={{ width: `${val}%` }} />
    </div>
  </div>
);

export default StudentDashboard;
