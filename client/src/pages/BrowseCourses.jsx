import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, User, Calendar, CheckCircle, Loader2, Search, LogOut, RefreshCw } from 'lucide-react';
import { courseService } from '../services/courseService';
import { enrollmentService } from '../services';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function BrowseCourses() {
  const navigate = useNavigate();

  const [courses,       setCourses]       = useState([]);
  // Map of courseId -> enrollmentId (for unenroll)
  const [enrollmentMap, setEnrollmentMap] = useState({});
  const [loading,       setLoading]       = useState(true);
  const [actionId,      setActionId]      = useState(null); // courseId being acted on
  const [search,        setSearch]        = useState('');
  const [message,       setMessage]       = useState({ text: '', type: 'success' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [coursesRes, enrollRes] = await Promise.all([
        courseService.getAll(),
        enrollmentService.getMyEnrollments(),
      ]);

      const fetchedCourses = coursesRes.courses || [];
      console.log('Fetched courses:', fetchedCourses); // Debug log
      setCourses(fetchedCourses);

      // Build map: courseId -> enrollmentId
      const map = {};
      (enrollRes.enrollments || []).forEach((e) => {
        const cid = e.courseId?._id || e.courseId;
        map[cid] = e._id;
      });
      setEnrollmentMap(map);
    } catch (err) {
      console.error('BrowseCourses error:', err);
      showMessage('Failed to load courses. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: 'success' }), 4000);
  };

  const handleEnroll = async (courseId, courseTitle) => {
    setActionId(courseId);
    try {
      const res = await enrollmentService.enroll(courseId);
      const enrollmentId = res.enrollment?._id;
      setEnrollmentMap((prev) => ({ ...prev, [courseId]: enrollmentId }));
      showMessage(`Enrolled in "${courseTitle}"! Check your Recommendations page.`, 'success');
    } catch (err) {
      showMessage(err.response?.data?.message || 'Enrollment failed.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleUnenroll = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to unenroll from "${courseTitle}"?`)) return;
    const enrollmentId = enrollmentMap[courseId];
    if (!enrollmentId) return;

    setActionId(courseId);
    try {
      await enrollmentService.unenroll(enrollmentId);
      setEnrollmentMap((prev) => {
        const next = { ...prev };
        delete next[courseId];
        return next;
      });
      showMessage(`Unenrolled from "${courseTitle}".`, 'info');
    } catch (err) {
      showMessage(err.response?.data?.message || 'Unenroll failed.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const msgStyle = {
    success: 'bg-green-500/10 border-green-500/40 text-green-400',
    error:   'bg-red-500/10 border-red-500/40 text-red-400',
    info:    'bg-yellow-500/10 border-yellow-500/40 text-yellow-400',
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6">
      <div className="max-w-[1000px] mx-auto">

        <button
          onClick={() => navigate('/student')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition text-sm"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl"><BookOpen size={20} /></div>
            <div>
              <h1 className="text-2xl font-bold">Browse Courses</h1>
              <p className="text-gray-400 text-sm">Enroll in a course to access its quizzes and materials</p>
            </div>
          </div>
          <button 
            onClick={fetchAll}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition disabled:opacity-50"
            title="Refresh courses"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex gap-4 mt-4 mb-6 text-sm text-slate-400">
          <span>{courses.length} courses available</span>
          <span>·</span>
          <span className="text-green-400 font-medium">{Object.keys(enrollmentMap).length} enrolled</span>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by course name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-[#1e293b] border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Message banner */}
        {message.text && (
          <div className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 ${msgStyle[message.type]}`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' && <CheckCircle size={16} />}
              {message.text}
            </div>
            <button onClick={() => setMessage({ text: '', type: 'success' })} className="opacity-50 hover:opacity-100">
              <LogOut size={14} className="rotate-45" /> {/* Close icon fallback */}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
            <Loader2 size={22} className="animate-spin" /> Loading courses...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No courses found</p>
            <p className="text-sm mt-1">
              {search ? 'Try a different search term.' : 'No active courses available yet.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map((course) => {
              const isEnrolled  = !!enrollmentMap[course._id];
              const isActing    = actionId === course._id;

              return (
                <div
                  key={course._id}
                  className={`bg-[#1e293b] border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                    isEnrolled ? 'border-green-500/40' : 'border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div>
                    {course.category && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                        {course.category}
                      </span>
                    )}
                    <h3 className="font-bold text-lg mt-2 mb-1">{course.title}</h3>
                    <p className="text-slate-400 text-sm line-clamp-2 mb-4">{course.description}</p>

                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-5">
                      <span className="flex items-center gap-1" title="Course Instructor">
                        <User size={12} /> {course.teacherName || course.teacherId?.name || 'Teacher'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {formatDate(course.startDate)} – {formatDate(course.endDate)}
                      </span>
                    </div>
                  </div>

                  {isEnrolled ? (
                    <div className="flex gap-2">
                      {/* Enrolled badge */}
                      <div className="flex-1 flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2.5 rounded-xl text-sm font-medium">
                        <CheckCircle size={15} /> Enrolled
                      </div>
                      {/* Unenroll button */}
                      <button
                        onClick={() => handleUnenroll(course._id, course.title)}
                        disabled={isActing}
                        title="Unenroll from this course"
                        className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-2.5 rounded-xl text-xs font-medium transition disabled:opacity-50"
                      >
                        {isActing
                          ? <Loader2 size={14} className="animate-spin" />
                          : <><LogOut size={14} /> Unenroll</>
                        }
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course._id, course.title)}
                      disabled={isActing}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 py-2.5 rounded-xl font-semibold text-sm hover:scale-[1.01] transition disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isActing
                        ? <><Loader2 size={16} className="animate-spin" /> Enrolling...</>
                        : 'Enroll Now'
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
