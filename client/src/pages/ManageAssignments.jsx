import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, PlusCircle, FileText, Calendar, Users, 
  CheckCircle, Loader2, Trash2, Edit3, Eye, Download, Star
} from "lucide-react";
import { courseService } from "../services/courseService";
import { assignmentService, assignmentSubmissionService } from "../services";

const fmt = (d) => {
  if (!d) return "Not set";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-IN", { 
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" 
  });
};

export default function ManageAssignments() {
  const navigate = useNavigate();

  const [courses,     setCourses]     = useState([]);
  const [courseId,    setCourseId]    = useState("");
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  // Create/Edit state
  const [showForm,    setShowForm]    = useState(false);
  const [formData,    setFormData]    = useState({ 
    title: "", 
    description: "", 
    startDate: new Date().toISOString().slice(0, 16), 
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), 
    totalMarks: 100 
  });
  const [editingId,   setEditingId]   = useState(null);

  // Submissions state
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions,        setSubmissions]        = useState([]);
  const [subLoading,         setSubLoading]         = useState(false);
  const [showSubmissions,    setShowSubmissions]    = useState(false);

  // Grading state
  const [gradingId,   setGradingId]   = useState(null);
  const [gradeData,   setGradeData]   = useState({ marks: 0, feedback: "" });

  useEffect(() => {
    courseService.getMyCourses().then((res) => {
      setCourses(res.courses || []);
      if (res.courses?.length > 0) setCourseId(res.courses[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!courseId) return;
    loadAssignments();
  }, [courseId]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const res = await assignmentService.getByCourse(courseId);
      setAssignments(res.assignments || []);
    } catch (err) {
      setError("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    setShowSubmissions(true);
    setSubLoading(true);
    try {
      const res = await assignmentSubmissionService.getByAssignment(assignment._id);
      setSubmissions(res.submissions || []);
    } catch (err) {
      alert("Failed to load submissions.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!formData.title) return alert("Title is required.");
    if (!formData.startDate) return alert("Please select a Starting Date and time.");
    if (!formData.dueDate) return alert("Please select a Due Date and time.");
    
    if (new Date(formData.startDate) >= new Date(formData.dueDate)) {
      return alert("Starting Date must be before the Due Date.");
    }
    
    setLoading(true);
    try {
      if (editingId) {
        await assignmentService.update(editingId, formData);
      } else {
        await assignmentService.create({ ...formData, courseId });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ 
        title: "", 
        description: "", 
        startDate: new Date().toISOString().slice(0, 16), 
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), 
        totalMarks: 100 
      });
      loadAssignments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save assignment.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this assignment and all submissions?")) return;
    try {
      await assignmentService.delete(id);
      setAssignments(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const handleGrade = async () => {
    if (gradeData.marks < 0) return alert("Marks cannot be negative.");
    try {
      await assignmentSubmissionService.grade(gradingId, gradeData);
      setSubmissions(prev => prev.map(s => s._id === gradingId ? { ...s, marks: gradeData.marks, feedback: gradeData.feedback, status: "reviewed" } : s));
      setGradingId(null);
      alert("Graded successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Grading failed.");
    }
  };

  // Helper to format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatForInput = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const z = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}T${z(date.getHours())}:${z(date.getMinutes())}`;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8">
      <button onClick={() => navigate("/teacher/dashboard")} className="mb-6 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Manage Assignments</h1>
            <p className="text-slate-400 text-sm mt-1">Create and grade course assignments</p>
          </div>
          <button 
            onClick={() => { 
              setShowForm(true); 
              setEditingId(null); 
              setFormData({ 
                title: "", 
                description: "", 
                startDate: new Date().toISOString().slice(0, 16), 
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), 
                totalMarks: 100 
              }); 
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl font-semibold transition"
          >
            <PlusCircle size={18} /> New Assignment
          </button>
        </div>

        {/* Course Selector */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl mb-8">
          <label className="text-sm text-slate-400 mb-2 block font-medium">Select Course</label>
          <select 
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full max-w-md p-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500"
          >
            {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
        ) : (
          <div className="grid gap-4">
            {assignments.length === 0 ? (
              <div className="text-center py-20 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
                <FileText size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">No assignments created yet for this course.</p>
              </div>
            ) : assignments.map(a => (
              <div key={a._id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-500 transition shadow-lg">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{a.title}</h3>
                  <p className="text-slate-400 text-sm mt-1 line-clamp-1">{a.description}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5"><Calendar size={13} className="text-green-400" /> Opens: {fmt(a.startDate || a.createdAt)}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={13} className="text-blue-400" /> Due: {fmt(a.dueDate)}</span>
                    <span className="flex items-center gap-1.5"><Star size={13} className="text-yellow-400" /> Max Marks: {a.totalMarks}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => loadSubmissions(a)} className="flex items-center gap-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold transition">
                    <Users size={14} /> Submissions
                  </button>
                  <button onClick={() => { setEditingId(a._id); setFormData({ ...a, startDate: formatForInput(a.startDate), dueDate: formatForInput(a.dueDate) }); setShowForm(true); }} className="p-2 text-slate-400 hover:text-white transition" title="Edit">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDelete(a._id)} className="p-2 text-red-400 hover:text-red-300 transition" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <PlusCircle className="text-blue-500" /> {editingId ? "Edit Assignment" : "New Assignment"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1.5 block">Title *</label>
                <input 
                  className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none"
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1.5 block">Description</label>
                <textarea 
                  className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                  rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-1.5 block">Starting Date *</label>
                  <input type="datetime-local"
                    className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none"
                    value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-1.5 block">Due Date *</label>
                  <input type="datetime-local"
                    className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none"
                    value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1.5 block">Max Marks *</label>
                <input type="number"
                  className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none"
                  value={formData.totalMarks} onChange={e => setFormData({...formData, totalMarks: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 border border-slate-700 rounded-xl hover:bg-slate-700 font-bold transition">Cancel</button>
              <button onClick={handleSaveAssignment} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedAssignment?.title}</h2>
                <p className="text-slate-400 text-sm">Review student submissions</p>
              </div>
              <button onClick={() => setShowSubmissions(false)} className="text-slate-400 hover:text-white transition-colors">
                <Trash2 className="rotate-45" size={24} />
              </button>
            </div>

            {subLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-20 text-slate-500">No submissions yet.</div>
            ) : (
              <div className="overflow-y-auto space-y-3 pr-2">
                {submissions.map(s => (
                  <div key={s._id} className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between group hover:border-slate-500 transition">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-600/20 p-2.5 rounded-xl text-blue-400"><Users size={20} /></div>
                      <div>
                        <p className="font-bold">{s.studentId?.name || "Unknown Student"}</p>
                        <p className="text-xs text-slate-500">{fmt(s.submittedAt)} {s.status === 'late' && <span className="text-red-400 ml-1">(Late)</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {s.status === "reviewed" ? (
                        <div className="text-right mr-4">
                          <p className="text-xs text-slate-500">Graded</p>
                          <p className="text-sm font-bold text-green-400">{s.marks} / {selectedAssignment?.totalMarks}</p>
                        </div>
                      ) : (
                        <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded shadow-sm mr-4">Needs Grading</span>
                      )}
                      <a 
                        href={`http://localhost:5000${s.fileUrl}`} 
                        target="_blank" rel="noopener noreferrer"
                        className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition" 
                        title="View Document"
                      >
                        <Eye size={18} />
                      </a>
                      <button 
                        onClick={() => { setGradingId(s._id); setGradeData({ marks: s.marks || 0, feedback: s.feedback || "" }); }} 
                        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold transition"
                      >
                        {s.status === "reviewed" ? "Regrade" : "Grade"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in scale-95 duration-200">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Star className="text-yellow-500" /> Grade Submission</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1.5 block">Marks (Max: {selectedAssignment?.totalMarks})</label>
                <input type="number" 
                  className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none"
                  value={gradeData.marks} onChange={e => setGradeData({...gradeData, marks: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400 mb-1.5 block">Teacher Feedback</label>
                <textarea 
                  className="w-full p-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                  rows={4} value={gradeData.feedback} onChange={e => setGradeData({...gradeData, feedback: e.target.value})}
                  placeholder="Well done! Keep it up..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setGradingId(null)} className="flex-1 py-3 border border-slate-700 rounded-xl hover:bg-slate-700 font-bold transition">Back</button>
              <button onClick={handleGrade} className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold transition">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
