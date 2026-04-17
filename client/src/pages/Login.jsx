import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap, User, Shield, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  const { login, loading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      const data = await login({ email, password });
      const map  = { student: "/student", teacher: "/teacher/dashboard", admin: "/admin" };
      navigate(from || map[data.user.role] || "/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white px-4">
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition">
          <ArrowLeft size={18} /> Back to Home
        </Link>
      </div>

      <div className="w-full max-w-md bg-[#1e293b] p-8 rounded-2xl shadow-xl border border-white/10">
        <div className="flex flex-col items-center">
          <div className="bg-blue-600 p-4 rounded-xl">
            <BookOpen size={28} />
          </div>
          <h2 className="text-2xl font-bold mt-6">Welcome Back</h2>
          <p className="text-gray-400 text-sm mt-2">
            Sign in to your Learning Management System
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full mt-1 px-4 py-3 bg-[#334155] text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full mt-1 px-4 py-3 bg-[#334155] text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Signing in...</>
              : "Sign In"
            }
          </button>

          <p className="text-slate-400 text-center text-sm">
            Don't have an account?{" "}
            <Link to="/signup" className="text-blue-400 hover:underline">
              Register here
            </Link>
          </p>

          <div className="border-t border-white/10 pt-4 text-xs text-gray-500 text-center space-y-1">
            <p className="font-semibold text-gray-400">Demo Credentials</p>
            <p>Student: student@example.com / password123</p>
            <p>Teacher: teacher@example.com / password123</p>
            <p>Admin: admin@example.com / password123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
