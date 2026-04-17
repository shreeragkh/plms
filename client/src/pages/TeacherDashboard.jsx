import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, LogOut, PlusCircle, Upload, BarChart2,
  ChevronDown, ChevronUp, Loader2, CheckCircle,
  FolderOpen, Archive, Trash2, RefreshCw, Users,
} from "lucide-react";
import { courseService } from "../services/courseService";
import DashboardCards from "./DashboardCards";
import PendingQuizzes from "./PendingQuizzes";
import ActivityTable  from "./ActivityTable";

const statusStyle = (s) =>
  s === "active"    ? "bg-green-500/20 text-green-400 border-green-500/30"   :
  s === "archived"  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
  s === "completed" ? "bg-blue-500/20 text-blue-400 border-blue-500/30"      :
                      "bg-slate-600/20 text-slate-400 border-slate-500/30";

export default function TeacherDashboard() {
  const navigate        = useNavigate();
  const { user, logout } = useAuth();
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [courses,          setCourses]          = useState([]);
  const [coursesLoading,   setCoursesLoading]   = useState(true);
  const [actionId,         setActionId]         = useState(null); // courseId being acted on
  const [message,          setMessage]          = useState({ text: "", type: "success" });

  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const res = await courseService.getMyCourses();
      setCourses(res.courses || []);
    } catch (e) { console.error(e); }
    finally { setCoursesLoading(false); }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const flash = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "success" }), 3500);
  };

  const handleSetStatus = async (course, newStatus) => {
    const label = newStatus === "archived" ? "archive" : newStatus === "active" ? "restore" : newStatus;
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} "${course.title}"?`)) return;
    setActionId(course._id);
    try {
      await courseService.setStatus(course._id, newStatus);
      setCourses(prev => prev.map(c => c._id === course._id ? { ...c, status: newStatus } : c));
      flash(`"${course.title}" marked as ${newStatus}.`);
    } catch (e) {
      flash(e.response?.data?.message || "Action failed.", "error");
    } finally { setActionId(null); }
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Permanently delete "${course.title}"? This removes all quizzes, materials and enrollments for this course.`)) return;
    setActionId(course._id);
    try {
      await courseService.delete(course._id);
      setCourses(prev => prev.filter(c => c._id !== course._id));
      flash(`"${course.title}" deleted.`);
    } catch (e) {
      flash(e.response?.data?.message || "Delete failed.", "error");
    } finally { setActionId(null); }
  };

  const handleCourseCreated = () => {
    setShowCreateCourse(false);
    loadCourses();
  };

  const msgStyle = {
    success: "bg-green-500/10 border-green-500/40 text-green-400",
    error:   "bg-red-500/10 border-red-500/40 text-red-400",
  };

  const activeCourses   = courses.filter(c => c.status === "active");
  const archivedCourses = courses.filter(c => c.status !== "active");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-white">

      {/* Header */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-8 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl"><BookOpen size={22} /></div>
          <div>
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
            <p className="text-slate-400 text-sm">
              Welcome back, <span className="text-white font-medium">{user?.name || "Teacher"}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600 border border-red-500/40 px-4 py-2 rounded-lg text-red-400 hover:text-white transition text-sm font-medium"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Flash message */}
      {message.text && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${msgStyle[message.type]}`}>
          {message.type === "success" && <CheckCircle size={15} />}
          {message.text}
        </div>
      )}

      {/* Create Course toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateCourse(v => !v)}
          className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:border-blue-500/50 px-5 py-3 rounded-xl text-sm font-medium transition"
        >
          <PlusCircle size={17} className="text-blue-400" />
          {showCreateCourse ? "Cancel" : "Create New Course"}
          {showCreateCourse ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {showCreateCourse && (
          <div className="mt-3">
            <CreateCourseForm onSuccess={handleCourseCreated} />
          </div>
        )}
      </div>

      {/* My Courses */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold flex items-center gap-2">
            <FolderOpen size={17} className="text-blue-400" />
            My Courses
            <span className="text-slate-400 text-sm font-normal">({courses.length})</span>
          </h2>
          <button onClick={loadCourses} className="text-slate-400 hover:text-white transition" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        {coursesLoading ? (
          <div className="flex items-center gap-2 text-slate-400 py-4 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <p className="text-slate-500 text-sm py-2">No courses yet. Create your first course above.</p>
        ) : (
          <>
            {/* Active courses */}
            {activeCourses.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Active</p>
                {activeCourses.map(course => (
                  <CourseRow
                    key={course._id}
                    course={course}
                    actionId={actionId}
                    onArchive={() => handleSetStatus(course, "archived")}
                    onDelete={() => handleDelete(course)}
                  />
                ))}
              </div>
            )}

            {/* Archived/completed courses */}
            {archivedCourses.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Archived / Completed</p>
                {archivedCourses.map(course => (
                  <CourseRow
                    key={course._id}
                    course={course}
                    actionId={actionId}
                    onRestore={() => handleSetStatus(course, "active")}
                    onDelete={() => handleDelete(course)}
                    archived
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

{/* // ── Header Action Buttons ────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <ActionButton icon={<PlusCircle size={22}/>}  label="Assignments"   sub="Manage course tasks"        color="from-orange-600 to-amber-600" onClick={() => navigate("/teacher/assignments")} />
        <ActionButton icon={<CheckCircle size={22}/>} label="Create Quiz"   sub="Write new questions"         color="from-blue-600 to-cyan-600"   onClick={() => navigate("/create-quiz")} />
        <ActionButton icon={<Upload size={22}/>}       label="Content"       sub="Upload study materials"     color="from-purple-600 to-indigo-600" onClick={() => navigate("/upload")} />
        <ActionButton icon={<BarChart2 size={22}/>}    label="Analytics"     sub="Student performance"        color="from-cyan-600 to-blue-600"    onClick={() => navigate("/analytics")} />
      </div>

      {/* Live stats */}
      <DashboardCards key={courses.length} />
      <PendingQuizzes />
      <ActivityTable />
    </div>
  );
}

// ── Course row with archive / restore / delete ─────────────────────────────
function CourseRow({ course, actionId, onArchive, onRestore, onDelete, archived = false }) {
  const isBusy = actionId === course._id;
  const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition ${
      archived
        ? "bg-slate-900/50 border-slate-700/50 opacity-75"
        : "bg-slate-700/30 border-slate-600 hover:border-slate-500"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-white truncate">{course.title}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium capitalize flex-shrink-0 ${statusStyle(course.status)}`}>
            {course.status}
          </span>
          {course.category && (
            <span className="text-[10px] text-slate-400">{course.category}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {fmt(course.startDate)} – {fmt(course.endDate)}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isBusy ? (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        ) : archived ? (
          <>
            <button
              onClick={onRestore}
              className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition px-2 py-1 bg-green-500/10 rounded-lg"
            >
              <RefreshCw size={12} /> Restore
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition"
            >
              <Trash2 size={13} /> Delete
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onArchive}
              className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition px-2 py-1 bg-yellow-500/10 rounded-lg"
            >
              <Archive size={12} /> Archive
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition"
            >
              <Trash2 size={13} /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Create Course Form ─────────────────────────────────────────────────────
function CreateCourseForm({ onSuccess }) {
  const [form,    setForm]    = useState({ title: "", description: "", category: "", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError("");
    if (!form.title.trim())       return setError("Course title is required.");
    if (!form.description.trim()) return setError("Description is required.");
    if (!form.startDate)          return setError("Start date is required.");
    if (!form.endDate)            return setError("End date is required.");
    if (new Date(form.endDate) <= new Date(form.startDate))
      return setError("End date must be after start date.");

    setLoading(true);
    try {
      await courseService.create(form);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSuccess(); }, 1500);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to create course.");
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="bg-green-500/10 border border-green-500/40 text-green-400 px-5 py-4 rounded-xl flex items-center gap-3">
      <CheckCircle size={20} /> Course created! Refreshing...
    </div>
  );

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold text-slate-200">New Course Details</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Course Title *</label>
          <input type="text" placeholder="e.g. Introduction to React" value={form.title}
            onChange={e => update("title", e.target.value)}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Category</label>
          <input type="text" placeholder="e.g. Web Development" value={form.category}
            onChange={e => update("category", e.target.value)}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Description *</label>
        <textarea placeholder="What will students learn?" value={form.description}
          onChange={e => update("description", e.target.value)}
          rows={2} className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-sm resize-none" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Start Date *</label>
          <input type="date" value={form.startDate} onChange={e => update("startDate", e.target.value)}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">End Date *</label>
          <input type="date" value={form.endDate} onChange={e => update("endDate", e.target.value)}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-sm" />
        </div>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}
      <button onClick={handleSubmit} disabled={loading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><CheckCircle size={16} /> Create Course</>}
      </button>
    </div>
  );
}

function ActionButton({ icon, label, sub, color, onClick }) {
  return (
    <button onClick={onClick}
      className={`bg-gradient-to-r ${color} p-6 rounded-xl text-left hover:scale-[1.02] hover:shadow-lg transition-all shadow-md`}>
      <div className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center mb-3">{icon}</div>
      <p className="font-bold text-lg">{label}</p>
      <p className="text-white/70 text-sm mt-0.5">{sub}</p>
    </button>
  );
}
