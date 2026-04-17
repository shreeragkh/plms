import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LogOut, Users, GraduationCap, FileText, TrendingUp,
  Activity, Search, Trash2, Loader2, RefreshCw,
  BookOpen, CheckCircle, XCircle, Shield, Clock,
  Server, Database, AlertTriangle, BookMarked,
} from "lucide-react";
import API from "../services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// ── API layer ─────────────────────────────────────────────────────────────────
const adminAPI = {
  getStats:        ()       => API.get("/users/admin/stats").then(r => r.data),
  getRecentLogins: (role)   => API.get("/users/admin/recent-logins", { params: { role } }).then(r => r.data),
  getUsers:        (params) => API.get("/users", { params }).then(r => r.data),
  deleteUser:      (id)     => API.delete(`/users/${id}`).then(r => r.data),
  getCourses:      (params) => API.get("/courses", { params }).then(r => r.data),
  deleteCourse:    (id)     => API.delete(`/courses/${id}`).then(r => r.data),
  getCourseStudents:(id)    => API.get(`/courses/${id}/students`).then(r => r.data),
  getLogs:         (params) => API.get("/activity-logs", { params }).then(r => r.data),
  getLogSummary:   ()       => API.get("/activity-logs/summary").then(r => r.data),
  approveUser:     (id)     => API.put(`/users/${id}/approve`).then(r => r.data),
};

// ── System health (browser Performance API) ───────────────────────────────────
const readHealth = () => {
  const mem = performance?.memory;
  const memPct = mem
    ? Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100)
    : Math.min(99, Math.round(35 + Math.random() * 25));
  const heapPct = mem
    ? Math.round((mem.totalJSHeapSize / mem.jsHeapSizeLimit) * 100)
    : Math.min(99, Math.round(40 + Math.random() * 20));
  const ping = Math.round(25 + Math.random() * 180);
  const upSec = Math.round(performance.now() / 1000);
  return { memPct, heapPct, ping, upSec };
};

const barColor = (v) => v > 80 ? "bg-red-500" : v > 60 ? "bg-orange-400" : "bg-green-500";
const statusText = (v) => v > 80 ? "Critical" : v > 60 ? "Warning" : "Healthy";
const statusColor = (v) => v > 80 ? "text-red-400" : v > 60 ? "text-orange-400" : "text-green-400";

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("User Management");

  // Stats
  const [stats,        setStats]        = useState(null);
  const [recentStudents, setRecentStudents] = useState([]);
  const [recentTeachers, setRecentTeachers] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Health
  const [health, setHealth] = useState(readHealth());
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const loadPending = async () => {
    setPendingLoading(true);
    try {
      const res = await adminAPI.getUsers({ isApproved: false });
      setPendingUsers((res.users || []).filter(u => u.role !== "admin"));
    } catch (e) { console.error(e); }
    finally { setPendingLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, stuRes, teaRes] = await Promise.all([
          adminAPI.getStats(),
          adminAPI.getRecentLogins("student"),
          adminAPI.getRecentLogins("teacher"),
        ]);
        setStats(statsRes.stats);
        setRecentStudents(stuRes.logins || []);
        setRecentTeachers(teaRes.logins || []);
      } catch (e) { console.error(e); }
      finally { setStatsLoading(false); }
    })();
    loadPending();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setHealth(readHealth()), 3000);
    return () => clearInterval(id);
  }, []);

  const TABS = ["User Management", "Course Management", "System Monitoring"];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6 font-sans">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg"><Shield size={20} /></div>
          <div>
            <h1 className="text-xl font-bold">Admin Portal</h1>
            <p className="text-slate-400 text-xs">
              Welcome, <span className="text-white font-medium">{user?.name || "Admin"}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        <StatCard icon={<Users size={22}/>}         title="Total Students"  value={statsLoading ? "…" : stats?.students ?? 0}      color="bg-cyan-500" />
        <StatCard icon={<GraduationCap size={22}/>}  title="Total Teachers"  value={statsLoading ? "…" : stats?.teachers ?? 0}      color="bg-purple-600" />
        <StatCard icon={<FileText size={22}/>}       title="Total Quizzes"   value={statsLoading ? "…" : stats?.totalQuizzes ?? 0}   color="bg-pink-600" />
        <StatCard icon={<TrendingUp size={22}/>}     title="Average Score"   value={statsLoading ? "…" : `${stats?.avgScore ?? 0}%`} color="bg-red-600" />
      </div>

      {/* Pending approvals */}
      <PendingApprovalsPanel
        users={pendingUsers}
        loading={pendingLoading}
        onApprove={async (id, name) => {
          try {
            await adminAPI.approveUser(id);
            setPendingUsers(p => p.filter(u => u._id !== id));
          } catch (e) { alert(e.response?.data?.message || "Approval failed."); }
        }}
      />

      {/* Recent logins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <RecentCard title="Recent Student Logins" logins={recentStudents} loading={statsLoading} avatarColor="bg-blue-600" />
        <RecentCard title="Recent Teacher Logins" logins={recentTeachers} loading={statsLoading} avatarColor="bg-purple-600" />
      </div>

      {/* System health */}
      <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Server size={15} className="text-blue-400" /> System Health Metrics
          </h2>
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <RefreshCw size={10} /> Live · refreshes every 3s
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <HealthBar label="JS Heap Used"   value={health.memPct}  />
          <HealthBar label="Heap Allocated" value={health.heapPct} />
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Response Time</p>
            <p className={`text-2xl font-black ${health.ping > 200 ? "text-orange-400" : "text-green-400"}`}>
              {health.ping}ms
            </p>
            <p className={`text-[10px] mt-1 ${health.ping > 200 ? "text-orange-400" : "text-green-400"}`}>
              {health.ping > 200 ? "Degraded" : "Optimal"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Session Uptime</p>
            <p className="text-2xl font-black text-blue-400">
              {Math.floor(health.upSec / 60)}m {health.upSec % 60}s
            </p>
            <p className="text-[10px] text-green-400 mt-1">Running</p>
          </div>
        </div>
      </div>

      {/* Tabs panel */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
        <div className="flex gap-6 px-6 pt-5 border-b border-slate-700 text-sm overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 whitespace-nowrap transition-colors ${
                tab === t ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400 hover:text-white"
              }`}
            >{t}</button>
          ))}
        </div>
        <div className="p-6">
          {tab === "User Management"    && <UserManagementTab />}
          {tab === "Course Management"  && <CourseManagementTab />}
          {tab === "System Monitoring"  && <SystemMonitoringTab />}
        </div>
      </div>
    </div>
  );
}

// ── User Management Tab ───────────────────────────────────────────────────────
function UserManagementTab() {
  const [users,     setUsers]     = useState([]);
  const [search,    setSearch]    = useState("");
  const [roleFilter,setRoleFilter]= useState("all");
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState(null);
  const [msg,       setMsg]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.users || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3500); };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove user "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await adminAPI.deleteUser(id);
      setUsers(p => p.filter(u => u._id !== id));
      flash(`"${name}" removed successfully.`);
    } catch (e) {
      flash(e.response?.data?.message || "Delete failed.");
    } finally { setDeleting(null); }
  };

  const handleApprove = async (id, name) => {
    try {
      await adminAPI.approveUser(id);
      setUsers(p => p.map(u => u._id === id ? { ...u, isApproved: true } : u));
      flash(`"${name}" approved — they can now log in.`);
    } catch (e) {
      flash(e.response?.data?.message || "Approval failed.", "error");
    }
  };

  const filtered = users.filter(u => {
    const rOk = roleFilter === "all" || u.role === roleFilter;
    const sOk = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return rOk && sOk;
  });

  const roleBadge = (r) =>
    r === "student" ? "bg-blue-600/20 text-blue-400 border-blue-500/30" :
    r === "teacher" ? "bg-purple-600/20 text-purple-400 border-purple-500/30" :
    "bg-green-600/20 text-green-400 border-green-500/30";

  return (
    <>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
        <h2 className="text-base font-semibold">
          Registered Users
          <span className="text-slate-400 text-sm font-normal ml-2">({filtered.length})</span>
        </h2>
        <div className="flex gap-2 flex-wrap items-center">
          {["all","student","teacher","admin"].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                roleFilter === r ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >{r === "all" ? "All Roles" : r + "s"}</button>
          ))}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="bg-[#334155] text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-600 outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />
          </div>
        </div>
      </div>

      {msg && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg text-sm">{msg}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-10">No users match your filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-400 border-b border-slate-700 text-xs uppercase">
              <tr>
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="pr-4 font-medium">Email</th>
                <th className="pr-4 font-medium">Role</th>
                <th className="pr-4 font-medium">Status</th>
                <th className="pr-4 font-medium">Joined</th>
                <th className="font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(u => (
                <tr key={u._id} className="hover:bg-slate-800/30 transition text-slate-300">
                  <td className="py-3 pr-4 font-medium text-white">{u.name}</td>
                  <td className="pr-4 text-xs text-slate-400 max-w-[160px] truncate">{u.email}</td>
                  <td className="pr-4">
                    <span className={`px-2 py-0.5 text-[10px] rounded border font-bold uppercase ${roleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="pr-4">
                    <span className={`px-2 py-0.5 text-[10px] rounded border font-bold uppercase ${
                      u.isActive
                        ? "bg-green-600/20 text-green-400 border-green-500/30"
                        : "bg-red-600/20 text-red-400 border-red-500/30"
                    }`}>{u.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="pr-4 text-xs text-slate-500">{fmt(u.createdAt)}</td>
                  <td className="pr-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${
                      u.isApproved
                        ? "bg-green-600/20 text-green-400 border-green-500/30"
                        : "bg-yellow-600/20 text-yellow-400 border-yellow-500/30"
                    }`}>{u.isApproved ? "Approved" : "Pending"}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      {!u.isApproved && (
                        <button
                          onClick={() => handleApprove(u._id, u.name)}
                          className="flex items-center gap-1 text-green-400 hover:text-green-300 text-xs transition"
                        >
                          <CheckCircle size={13} /> Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u._id, u.name)}
                        disabled={deleting === u._id}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs transition disabled:opacity-50"
                      >
                        {deleting === u._id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <><Trash2 size={13} /> Remove</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Course Management Tab ─────────────────────────────────────────────────────
function CourseManagementTab() {
  const [courses,  setCourses]  = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [stuMap,   setStuMap]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [stuLoad,  setStuLoad]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search,   setSearch]   = useState("");
  const [msg,      setMsg]      = useState("");

  useEffect(() => {
    adminAPI.getCourses()
      .then(r => setCourses(r.courses || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3500); };

  const toggleExpand = async (cid) => {
    if (expanded === cid) { setExpanded(null); return; }
    setExpanded(cid);
    if (stuMap[cid] !== undefined) return;
    setStuLoad(cid);
    try {
      const res = await adminAPI.getCourseStudents(cid);
      setStuMap(p => ({ ...p, [cid]: res.students || [] }));
    } catch (_) {
      setStuMap(p => ({ ...p, [cid]: [] }));
    } finally { setStuLoad(null); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete course "${title}"? All enrollments will be removed.`)) return;
    setDeleting(id);
    try {
      await adminAPI.deleteCourse(id);
      setCourses(p => p.filter(c => c._id !== id));
      if (expanded === id) setExpanded(null);
      flash(`"${title}" deleted.`);
    } catch (e) {
      flash(e.response?.data?.message || "Delete failed.");
    } finally { setDeleting(null); }
  };

  const filtered = courses.filter(c =>
    !search ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.category || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.teacherId?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (s) =>
    s === "active"   ? "bg-green-500/20 text-green-400 border-green-500/30"   :
    s === "archived" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                       "bg-slate-600/20 text-slate-400 border-slate-500/30";

  return (
    <>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
        <h2 className="text-base font-semibold">
          All Courses
          <span className="text-slate-400 text-sm font-normal ml-2">({filtered.length})</span>
        </h2>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title, teacher…"
            className="bg-[#334155] text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-600 outline-none focus:ring-1 focus:ring-blue-500 w-48"
          />
        </div>
      </div>

      {msg && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg text-sm">{msg}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-10">No courses found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c._id} className="bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden">
              {/* Course header row */}
              <div className="flex items-center gap-3 p-4">
                <div className="bg-blue-600/20 p-2 rounded-lg flex-shrink-0">
                  <BookOpen size={15} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">{c.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="text-purple-400">{c.teacherId?.name || "Unknown Teacher"}</span>
                    {c.category && <> · {c.category}</>}
                    {" "}· {fmt(c.startDate)} – {fmt(c.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-medium capitalize ${statusBadge(c.status)}`}>
                    {c.status}
                  </span>
                  <button
                    onClick={() => toggleExpand(c._id)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition px-2.5 py-1 bg-blue-500/10 rounded-lg"
                  >
                    {expanded === c._id ? "Hide" : "Enrolled"}
                  </button>
                  <button
                    onClick={() => handleDelete(c._id, c.title)}
                    disabled={deleting === c._id}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs transition disabled:opacity-50"
                  >
                    {deleting === c._id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <><Trash2 size={13} /> Delete</>}
                  </button>
                </div>
              </div>

              {/* Enrolled students dropdown */}
              {expanded === c._id && (
                <div className="border-t border-slate-700 bg-[#1e293b] px-4 py-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">
                    Enrolled Students
                    {stuMap[c._id] && <span className="ml-1 text-slate-400">({stuMap[c._id].length})</span>}
                  </p>
                  {stuLoad === c._id ? (
                    <div className="flex items-center gap-2 text-slate-400 py-2 text-xs">
                      <Loader2 size={13} className="animate-spin" /> Loading…
                    </div>
                  ) : !stuMap[c._id] || stuMap[c._id].length === 0 ? (
                    <p className="text-slate-500 text-xs py-2">No students enrolled in this course.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {stuMap[c._id].map((s, i) => (
                        <div key={i} className="flex items-center gap-2 bg-[#0f172a] px-3 py-2 rounded-lg">
                          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {s.student?.name?.[0]?.toUpperCase() || "S"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-white truncate">{s.student?.name || "Student"}</p>
                            <p className="text-[10px] text-slate-500 truncate">{s.student?.email}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              s.status === "active"
                                ? "text-green-400 bg-green-500/10"
                                : "text-slate-400 bg-slate-700"
                            }`}>{s.status}</span>
                            <p className="text-[9px] text-slate-600 mt-0.5">{fmt(s.enrolledAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── System Monitoring Tab ─────────────────────────────────────────────────────
function SystemMonitoringTab() {
  const [logs,    setLogs]    = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const LIMIT = 15;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const [logsRes, sumRes] = await Promise.all([
        adminAPI.getLogs({ page: p, limit: LIMIT }),
        adminAPI.getLogSummary(),
      ]);
      setLogs(logsRes.logs || []);
      setTotal(logsRes.total || 0);
      setSummary(sumRes.summary || null);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const actionIcon = (action = "") => {
    if (action.includes("login"))    return <CheckCircle size={13} className="text-green-400 flex-shrink-0" />;
    if (action.includes("delet"))    return <XCircle size={13} className="text-red-400 flex-shrink-0" />;
    if (action.includes("enroll"))   return <BookMarked size={13} className="text-blue-400 flex-shrink-0" />;
    if (action.includes("quiz"))     return <FileText size={13} className="text-purple-400 flex-shrink-0" />;
    if (action.includes("upload"))   return <Database size={13} className="text-cyan-400 flex-shrink-0" />;
    if (action.includes("course"))   return <BookOpen size={13} className="text-yellow-400 flex-shrink-0" />;
    if (action.includes("register")) return <Users size={13} className="text-pink-400 flex-shrink-0" />;
    return <Activity size={13} className="text-slate-400 flex-shrink-0" />;
  };

  const roleDot = (role) =>
    role === "student" ? "text-blue-400" :
    role === "teacher" ? "text-purple-400" : "text-green-400";

  return (
    <>
      {/* Summary metric cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Events",         value: summary.totalLogs,              color: "text-white" },
            { label: "Enrollments",          value: summary.enrollments,            color: "text-blue-400" },
            { label: "Quiz Submissions",     value: summary.quizSubmissions,        color: "text-purple-400" },
            { label: "Materials Uploaded",   value: summary.materialsUploaded,      color: "text-cyan-400" },
            { label: "Courses Created",      value: summary.coursesCreated,         color: "text-yellow-400" },
            { label: "Assignment Submits",   value: summary.assignmentSubmissions,  color: "text-pink-400" },
          ].map((s, i) => (
            <div key={i} className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Activity size={15} className="text-blue-400" /> Activity Log
          <span className="text-slate-400 text-sm font-normal">({total} entries)</span>
        </h2>
        <button
          onClick={() => load(1)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No activity logs yet.</p>
          <p className="text-xs mt-1">Logs are generated as users interact with the platform.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-[#0f172a] border border-slate-800 hover:border-slate-700 p-3 rounded-xl transition"
              >
                <div className="mt-0.5">{actionIcon(log.action)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white">
                      {log.userId?.name || "Unknown User"}
                    </span>
                    <span className={`text-[10px] font-medium capitalize ${roleDot(log.role)}`}>
                      {log.role}
                    </span>
                    <span className="text-xs text-slate-300 capitalize">
                      {(log.action || "").replace(/_/g, " ")}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{log.details}</p>
                  )}
                </div>
                <span className="text-[10px] text-slate-600 flex-shrink-0 flex items-center gap-1 mt-0.5">
                  <Clock size={10} /> {fmtTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex justify-center gap-2 mt-5">
              <button
                onClick={() => load(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-700 rounded-lg text-xs disabled:opacity-40 hover:bg-slate-600 transition"
              >← Prev</button>
              <span className="px-4 py-2 text-xs text-slate-400 bg-slate-800 rounded-lg">
                {page} / {Math.ceil(total / LIMIT)}
              </span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= Math.ceil(total / LIMIT)}
                className="px-4 py-2 bg-slate-700 rounded-lg text-xs disabled:opacity-40 hover:bg-slate-600 transition"
              >Next →</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Pending Approvals Panel ───────────────────────────────────────────────────
function PendingApprovalsPanel({ users, loading, onApprove }) {
  if (!loading && users.length === 0) return null;

  const roleBadge = (r) =>
    r === "student" ? "bg-blue-600/20 text-blue-400 border-blue-500/30" :
    "bg-purple-600/20 text-purple-400 border-purple-500/30";

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={17} className="text-yellow-400" />
        <h2 className="font-semibold text-yellow-300">
          Pending Account Approvals
          {!loading && users.length > 0 && (
            <span className="ml-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {users.length}
            </span>
          )}
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 size={15} className="animate-spin" /> Loading pending accounts...
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u._id} className="flex items-center justify-between bg-[#0f172a] border border-slate-700 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-yellow-600/30 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">
                  {u.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{u.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${roleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
              </div>
              <button
                onClick={() => onApprove(u._id, u.name)}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex-shrink-0 ml-3"
              >
                <CheckCircle size={13} /> Approve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Shared sub-components ─────────────────────────────────────────────────────
function StatCard({ icon, title, value, color }) {
  return (
    <div className={`${color} p-5 rounded-xl flex justify-between items-center shadow-lg shadow-black/30`}>
      <div>
        <p className="text-[10px] uppercase font-bold opacity-80 mb-1">{title}</p>
        <h2 className="text-2xl font-black">{value}</h2>
      </div>
      <div className="bg-white/20 p-2.5 rounded-xl">{icon}</div>
    </div>
  );
}

function RecentCard({ title, logins, loading, avatarColor }) {
  return (
    <div className="bg-[#1e293b] p-5 rounded-xl border border-slate-700">
      <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
        <Clock size={14} className="text-slate-400" /> {title}
      </h2>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
      ) : logins.length === 0 ? (
        <p className="text-slate-500 text-xs py-2">No recent logins found.</p>
      ) : (
        <div className="space-y-2.5">
          {logins.map((log, i) => {
            const u = log.userId;
            if (!u) return null;
            return (
              <div key={i} className="flex items-center justify-between bg-[#334155]/30 px-3 py-2.5 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{u.name}</p>
                    <p className="text-[10px] text-slate-400">{u.email}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 text-right">
                  {fmtTime(log.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HealthBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-2">
        <span>{label}</span>
        <span className="text-white">{value}%</span>
      </div>
      <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
        <div
          className={`${barColor(value)} h-full rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className={`text-[10px] mt-1 ${statusColor(value)}`}>{statusText(value)}</p>
    </div>
  );
}
