import { Link } from "react-router-dom";
import { BookOpen, Users, BarChart3, MessageSquare, BookMarked, GraduationCap } from "lucide-react";

export default function Landing() {
  return (
    <div className="bg-gradient-to-b from-[#0f172a] to-[#111827] text-white min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <WhyChoose />
      <CTA />
    </div>
  );
}

function Navbar() {
  return (
    <div className="flex justify-end items-center px-10 py-5 border-b border-white/10">
      <div className="flex items-center gap-6">
        <Link to="/login" className="text-sm text-gray-300 hover:text-white">
          Login
        </Link>
        <Link to="/signup" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Get Started
        </Link>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="text-center py-24 px-6">
      <span className="bg-blue-500/20 text-blue-400 text-xs px-4 py-1 rounded-full">
        Learning Management System
      </span>

      <h1 className="text-4xl md:text-5xl font-bold mt-6">
        Personalized Learning <br />
        <span className="text-blue-500">Management System</span>
      </h1>

      <p className="text-gray-400 mt-6 max-w-xl mx-auto">
        Transform education with interactive quizzes, real-time analytics,
        and personalized learning resources for students and teachers.
      </p>

      <div className="flex justify-center gap-4 mt-8">
        <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-md transition">
          Start Learning Today →
        </Link>
        <Link to="/login" className="border border-white/20 px-6 py-3 rounded-md hover:bg-white/10 transition">
          Sign In
        </Link>
      </div>

      <div className="flex justify-center gap-6 mt-16 flex-wrap">
        <RoleCard
          icon={<Users className="text-blue-400" />}
          title="For Students"
          description="Take quizzes, track progress, and access personalized learning resources."
        />
        <RoleCard
          icon={<GraduationCap className="text-pink-400" />}
          title="For Teachers"
          description="Create courses, manage assessments, and monitor student performance."
        />
      </div>
    </section>
  );
}

function RoleCard({ icon, title, description }) {
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-xl w-72 hover:bg-white/10 transition">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-gray-400 text-sm mt-2">{description}</p>
    </div>
  );
}

function Features() {
  const features = [
    {
      icon: <BookOpen className="text-blue-400" />,
      title: "Course Management",
      desc: "Create and manage courses with structured learning materials.",
    },
    {
      icon: <BookMarked className="text-pink-400" />,
      title: "Quiz System",
      desc: "Build quizzes with auto-grading and instant score feedback.",
    },
    {
      icon: <BarChart3 className="text-green-400" />,
      title: "Performance Analytics",
      desc: "Detailed insights and progress tracking for students and teachers.",
    },
    {
      icon: <MessageSquare className="text-orange-400" />,
      title: "Instant Feedback",
      desc: "Real-time quiz results with score breakdown per question.",
    },
    {
      icon: <Users className="text-purple-400" />,
      title: "Multi-role Support",
      desc: "Separate dashboards for students, teachers and administrators.",
    },
    {
      icon: <GraduationCap className="text-cyan-400" />,
      title: "Learning Resources",
      desc: "Upload and access documents and videos for each course.",
    },
  ];

  return (
    <section className="py-20 px-10">
      <h2 className="text-center text-2xl font-bold">
        Powerful Features for Modern Education
      </h2>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12">
        {features.map((f, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition"
          >
            <div className="mb-4">{f.icon}</div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-gray-400 text-sm mt-2">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyChoose() {
  return (
    <section className="py-20 px-10 max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
      <div>
        <h2 className="text-2xl font-bold">Why Choose PLMS?</h2>
        <ul className="mt-6 space-y-4 text-gray-400">
          <li>✔ Real-time progress tracking and analytics</li>
          <li>✔ Auto-graded quizzes with instant feedback</li>
          <li>✔ Course enrollment and material access</li>
          <li>✔ Performance-based learning resources</li>
          <li>✔ Admin monitoring and user management</li>
        </ul>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="bg-white/10 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-400">Course Progress</p>
          <div className="h-2 bg-gray-700 rounded-full mt-2">
            <div className="h-2 bg-blue-500 rounded-full w-3/4"></div>
          </div>
        </div>

        <div className="bg-green-500/20 text-green-400 p-4 rounded-lg text-sm">
          Quiz Completed – Score: 92%
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-[#1e1b4b] py-20 text-center">
      <h2 className="text-2xl font-bold">
        Ready to Transform Your Learning Experience?
      </h2>
      <br />
      <Link to="/signup" className="mt-6 bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-md transition">
        Get Started Free →
      </Link>
    </section>
  );
}
