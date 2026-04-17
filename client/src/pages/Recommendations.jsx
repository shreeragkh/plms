import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, FileText, CheckCircle, Clock, Zap, Loader2, BookOpen } from 'lucide-react';
import { enrollmentService, quizService, materialService } from '../services';

// YouTube search URLs by topic keyword
const youtubeSearch = (topic) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' tutorial')}`;

// Google Scholar / search for reading material
const readingSearch = (topic) =>
  `https://www.google.com/search?q=${encodeURIComponent(topic + ' study material pdf')}`;

const levelStyle = (level) => {
  if (level === 'Beginner')     return 'text-green-400 border-green-500/30 bg-green-500/10';
  if (level === 'Intermediate') return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
  return 'text-red-400 border-red-500/30 bg-red-500/10';
};

export default function RecommendationsPage() {
  const navigate   = useNavigate();
  const [activeTab, setActiveTab] = useState('All Resources');
  const [resources, setResources] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const build = async () => {
      try {
        const enrollRes = await enrollmentService.getMyEnrollments();
        const enrollments = enrollRes.enrollments || [];

        const all = [];

        await Promise.all(enrollments.map(async (en) => {
          const course = en.courseId;
          if (!course?._id) return;

          // ── Quizzes ──────────────────────────────────────────────────────
          try {
            const qRes = await quizService.getByCourse(course._id);
            (qRes.quizzes || []).forEach((q) => {
              all.push({
                id:       `quiz-${q._id}`,
                _id:      q._id,
                title:    q.title,
                category: 'Practice Quizzes',
                subject:  course.title,
                topic:    q.description || q.title,
                desc:     q.description || `Test your knowledge with ${q.questions?.length || 0} questions.`,
                time:     q.timeLimit > 0 ? `${q.timeLimit} min` : 'No limit',
                level:    'Intermediate',
                type:     'quiz',
                quizId:   q._id,
                totalMarks: q.totalMarks,
              });
            });
          } catch (_) {}

          // ── Materials ────────────────────────────────────────────────────
          try {
            const mRes = await materialService.getByCourse(course._id);
            (mRes.materials || []).forEach((m) => {
              const isVideo   = m.fileType === 'video' || m.fileType === 'mp4' || m.fileType === 'webm';
              const isPdf     = m.fileType === 'pdf' || m.fileType === 'doc' || m.fileType === 'docx';
              const type      = isVideo ? 'video' : isPdf ? 'reading' : 'reading';
              const category  = isVideo ? 'Videos' : 'Reading Materials';

              all.push({
                id:       `mat-${m._id}`,
                _id:      m._id,
                title:    m.title,
                category,
                subject:  course.title,
                topic:    m.description || m.title,
                desc:     m.description || `Study material for ${course.title}.`,
                time:     isVideo ? 'Watch' : 'Read',
                level:    'Beginner',
                type,
                fileUrl:  m.fileUrl,
                fileName: m.fileName,
              });
            });
          } catch (_) {}
        }));

        setResources(all);
      } catch (err) {
        console.error('Recommendations error:', err);
      } finally {
        setLoading(false);
      }
    };
    build();
  }, []);

  const filtered = activeTab === 'All Resources'
    ? resources
    : resources.filter((r) => r.category === activeTab);

  const handleStartLearning = (item) => {
    if (item.type === 'quiz') {
      navigate(`/quiz/${item.quizId}`);
      return;
    }

    if (item.type === 'video') {
      if (item.fileUrl) {
        window.open(`http://localhost:5000${item.fileUrl}`, '_blank');
      } else {
        window.open(youtubeSearch(item.topic), '_blank');
      }
      return;
    }

    if (item.type === 'reading') {
      if (item.fileUrl) {
        // Fetch as blob then trigger download — avoids ERR_INVALID_RESPONSE
        const url = `http://localhost:5000${item.fileUrl}`;
        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error("File not found");
            return res.blob();
          })
          .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = item.fileName || item.title || 'document';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
          })
          .catch(() => {
            // Fallback: open directly in new tab
            window.open(url, '_blank');
          });
      } else {
        window.open(readingSearch(item.topic), '_blank');
      }
      return;
    }
  };

  const tabs = ['All Resources', 'Videos', 'Practice Quizzes', 'Reading Materials'];
  const counts = {
    'All Resources':    resources.length,
    'Videos':           resources.filter(r => r.category === 'Videos').length,
    'Practice Quizzes': resources.filter(r => r.category === 'Practice Quizzes').length,
    'Reading Materials':resources.filter(r => r.category === 'Reading Materials').length,
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8 font-sans flex justify-center">
      <div className="w-full max-w-[1000px]">
        <button onClick={() => navigate('/student')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition">
          <ArrowLeft size={18} /> <span className="text-sm">Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/20">
            <Zap size={28} fill="white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Learning Resources</h1>
            <p className="text-gray-400 text-sm">Quizzes, videos and materials from your enrolled courses</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-800 mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-medium transition-colors whitespace-nowrap relative ${
                activeTab === tab
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
              {counts[tab] > 0 && (
                <span className="ml-2 text-xs bg-gray-700 px-1.5 py-0.5 rounded-full">
                  {counts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin" />
            <span>Loading your resources...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <BookOpen size={40} />
            <p className="text-lg font-medium">No resources found</p>
            <p className="text-sm text-center max-w-sm">
              {resources.length === 0
                ? 'Enroll in courses to see quizzes and materials here.'
                : `No ${activeTab.toLowerCase()} available yet.`}
            </p>
            {resources.length === 0 && (
              <button
                onClick={() => navigate('/student')}
                className="mt-2 bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg text-sm font-semibold transition"
              >
                Browse Courses
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-[#1e293b] border border-gray-800 p-6 rounded-xl hover:border-gray-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-4 mb-4">
                    <div className={`p-3 rounded-lg flex-shrink-0 ${
                      item.type === 'video'   ? 'bg-red-500/20 text-red-400' :
                      item.type === 'quiz'    ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {item.type === 'video'   ? <Video size={20} /> :
                       item.type === 'quiz'    ? <CheckCircle size={20} /> :
                       <FileText size={20} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base leading-tight mb-1">{item.title}</h3>
                      <p className="text-xs text-gray-500">{item.subject}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{item.desc}</p>

                  <div className="flex items-center gap-3 mb-5 text-xs flex-wrap">
                    <span className="flex items-center gap-1 text-gray-400">
                      <Clock size={12} /> {item.time}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${levelStyle(item.level)}`}>
                      {item.level}
                    </span>
                    {item.type === 'quiz' && item.totalMarks && (
                      <span className="text-purple-400">{item.totalMarks} marks</span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      item.type === 'video'   ? 'bg-red-500/10 text-red-400' :
                      item.type === 'quiz'    ? 'bg-blue-500/10 text-blue-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>
                      {item.type === 'video' ? 'Video' : item.type === 'quiz' ? 'Quiz' : 'Document'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartLearning(item)}
                  className={`w-full py-3 rounded-lg font-bold text-sm active:scale-95 transition-transform ${
                    item.type === 'quiz'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/20'
                      : item.type === 'video'
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-lg shadow-red-500/20'
                      : 'bg-gradient-to-r from-green-600 to-teal-600 shadow-lg shadow-green-500/20'
                  }`}
                >
                  {item.type === 'quiz'    ? 'Start Quiz'     :
                   item.type === 'video'   ? 'Watch Video'    :
                   'Read Document'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
