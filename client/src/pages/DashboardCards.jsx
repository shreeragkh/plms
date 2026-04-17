import { useState, useEffect } from "react";
import { quizService, userService } from "../services";
import { courseService } from "../services/courseService";

export default function DashboardCards() {
  const [stats,   setStats]   = useState({ totalStudents: 0, quizzesCreated: 0, coursesActive: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [coursesData, studentsData] = await Promise.all([
          courseService.getMyCourses(),
          userService.getTeacherStudents(),
        ]);

        const courses      = coursesData.courses  || [];
        const activeCourses = courses.filter(c => c.status === "active");

        // Count quizzes across all courses
        let quizCount = 0;
        await Promise.all(
          courses.map(async (course) => {
            try {
              const res = await quizService.getByCourse(course._id);
              quizCount += res.quizzes?.length || 0;
            } catch (_) {}
          })
        );

        setStats({
          totalStudents:  studentsData.count  || 0,
          quizzesCreated: quizCount,
          coursesActive:  activeCourses.length,
        });
      } catch (err) {
        console.error("DashboardCards error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      <StatCard label="Total Students"  value={stats.totalStudents}  color="text-blue-400"   loading={loading} />
      <StatCard label="Quizzes Created" value={stats.quizzesCreated} color="text-cyan-400"   loading={loading} />
      <StatCard label="Active Courses"  value={stats.coursesActive}  color="text-purple-400" loading={loading} />
    </div>
  );
}

function StatCard({ label, value, color, loading }) {
  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
      <h3 className="text-slate-400 text-sm">{label}</h3>
      <p className={`text-2xl font-bold mt-1 ${color}`}>
        {loading ? "..." : value}
      </p>
    </div>
  );
}
