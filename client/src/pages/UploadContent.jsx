import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Video, CheckCircle, Loader2, Trash2 } from "lucide-react";
import { courseService } from "../services/courseService";
import { materialService } from "../services";

const FILE_TYPES = [
  { value: "pdf",   label: "PDF Document",   icon: <FileText size={16}/>,  accept: ".pdf" },
  { value: "doc",   label: "Word Document",  icon: <FileText size={16}/>,  accept: ".doc,.docx" },
  { value: "ppt",   label: "Presentation",   icon: <FileText size={16}/>,  accept: ".ppt,.pptx" },
  { value: "video", label: "Video",          icon: <Video size={16}/>,     accept: "video/*" },
  { value: "image", label: "Image",          icon: <FileText size={16}/>,  accept: "image/*" },
];

export default function UploadContent() {
  const navigate = useNavigate();

  const [courses,     setCourses]     = useState([]);
  const [courseId,    setCourseId]    = useState("");
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [file,        setFile]        = useState(null);
  const [fileType,    setFileType]    = useState("pdf");
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState("");

  // Existing materials for selected course
  const [materials,   setMaterials]   = useState([]);
  const [matLoading,  setMatLoading]  = useState(false);
  const [deleting,    setDeleting]    = useState(null);

  // Load teacher's courses
  useEffect(() => {
    courseService.getMyCourses().then((res) => {
      const list = res.courses || [];
      setCourses(list);
      if (list.length > 0) setCourseId(list[0]._id);
    });
  }, []);

  // Load materials when course changes
  useEffect(() => {
    if (!courseId) return;
    setMatLoading(true);
    materialService.getByCourse(courseId)
      .then((res) => setMaterials(res.materials || []))
      .catch(() => setMaterials([]))
      .finally(() => setMatLoading(false));
  }, [courseId, success]);

  const handleUpload = async () => {
    setError("");
    if (!courseId)    return setError("Please select a course.");
    if (!title.trim()) return setError("Please enter a title.");
    if (!file)        return setError("Please select a file.");

    setLoading(true);
    try {
      await materialService.upload(courseId, file, title, description);
      setSuccess(true);
      setTitle(""); setDescription(""); setFile(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this material?")) return;
    setDeleting(id);
    try {
      await materialService.delete(id);
      setMaterials((prev) => prev.filter((m) => m._id !== id));
    } catch (_) {
      alert("Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  const getFileTypeIcon = (ft) => {
    if (ft === "video" || ft === "mp4" || ft === "webm") return <Video size={16} className="text-red-400" />;
    return <FileText size={16} className="text-blue-400" />;
  };

  const selectedAccept = FILE_TYPES.find((f) => f.value === fileType)?.accept || "*";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-white">
      <button onClick={() => navigate("/teacher/dashboard")} className="mb-6 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Upload Learning Content</h1>
        <p className="text-slate-400 text-sm">
          Upload PDFs, videos or documents for your students. They appear instantly on the student recommendations page.
        </p>

        {/* Upload form */}
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
            <label className="text-sm text-slate-400 mb-1 block">Content Title *</label>
            <input
              type="text"
              placeholder="e.g. Week 3 - React Hooks Notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Description (shown to students)</label>
            <textarea
              placeholder="Brief description of what this covers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">File Type</label>
            <div className="flex flex-wrap gap-2">
              {FILE_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  onClick={() => { setFileType(ft.value); setFile(null); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition ${
                    fileType === ft.value
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400"
                  }`}
                >
                  {ft.icon} {ft.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Select File *</label>
            <input
              type="file"
              accept={selectedAccept}
              key={fileType}
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="w-full p-3 bg-slate-700 rounded-lg border border-slate-600 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-xs file:cursor-pointer"
            />
            {file && (
              <p className="text-green-400 text-xs mt-1">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/40 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle size={16} /> Content uploaded successfully! Students can now see it.
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={loading || courses.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3 rounded-lg font-semibold hover:scale-105 transition disabled:opacity-60"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Uploading...</> : <><Upload size={18} /> Upload Content</>}
          </button>
        </div>

        {/* Existing materials for this course */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
          <h2 className="font-semibold mb-4 text-slate-300">
            Uploaded Materials
            {courseId && courses.find(c => c._id === courseId) && (
              <span className="text-slate-500 text-sm font-normal ml-2">
                — {courses.find(c => c._id === courseId)?.title}
              </span>
            )}
          </h2>

          {matLoading ? (
            <div className="flex items-center gap-2 text-slate-400 py-4">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : materials.length === 0 ? (
            <p className="text-slate-500 text-sm py-2">No materials uploaded for this course yet.</p>
          ) : (
            <div className="space-y-2">
              {materials.map((m) => (
                <div key={m._id} className="flex items-center justify-between bg-slate-700/50 border border-slate-600 p-3 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileTypeIcon(m.fileType)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.title}</p>
                      <p className="text-xs text-slate-400 truncate">{m.description || m.fileType?.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <button
                      onClick={() => {
                        const url = `http://localhost:5000${m.fileUrl}`;
                        fetch(url)
                          .then(r => r.blob())
                          .then(blob => {
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = m.fileName || m.title;
                            a.click();
                          })
                          .catch(() => window.open(url, '_blank'));
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(m._id)}
                      disabled={deleting === m._id}
                      className="text-red-400 hover:text-red-300 transition disabled:opacity-50"
                    >
                      {deleting === m._id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
