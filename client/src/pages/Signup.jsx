import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap, Users, Shield, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError]   = useState("");
  const [pending, setPending] = useState(false);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      const data = await register(form);
      // If pending approval, show message instead of redirecting
      if (data.pending) {
        setPending(true);
        return;
      }
      const map = { student: "/student", teacher: "/teacher/dashboard", admin: "/admin" };
      navigate(map[data.user.role] || "/");
    } catch (err) {
      setError(err.message);
    }
  };

  if (pending) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex items-center justify-center px-4 text-white">
        <div className="bg-[#1e293b] w-full max-w-md rounded-2xl p-8 shadow-xl border border-slate-700 text-center space-y-5">
          <div className="bg-yellow-500/20 p-4 rounded-xl inline-flex mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-yellow-400">Account Pending Approval</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Your account has been created successfully. An admin needs to approve it before you can log in.
          </p>
          <p className="text-slate-400 text-xs">You will be able to sign in once an admin approves your account.</p>
          <a href="/login" className="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition text-sm">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex items-center justify-center px-4 text-white">
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition">
          <ArrowLeft size={18} /> Back to Home
        </Link>
      </div>

      <div className="bg-[#1e293b] w-full max-w-md rounded-2xl p-8 shadow-xl border border-slate-700">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-500 p-4 rounded-xl">
            <BookOpen className="text-white" size={28} />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center mb-2">Create Account</h2>
        <p className="text-slate-400 text-center mb-6">
          Join our AI-powered Learning Management System
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-slate-300 text-sm">Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-[#334155] text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-[#334155] text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm">Password</label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-[#334155] text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <p className="text-slate-300 text-sm mb-3">Register as</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { role: "student", label: "Student", Icon: GraduationCap, active: "bg-blue-600 border-blue-500" },
                { role: "teacher", label: "Teacher", Icon: Users,         active: "bg-purple-600 border-purple-500" },
                { role: "admin",   label: "Admin",   Icon: Shield,        active: "bg-green-600 border-green-500" },
              ].map(({ role, label, Icon, active }) => (
                <div
                  key={role}
                  onClick={() => update("role", role)}
                  className={`cursor-pointer p-4 rounded-xl border text-center transition ${
                    form.role === role ? active : "bg-[#334155] border-slate-600 hover:border-slate-400"
                  }`}
                >
                  <Icon className="mx-auto mb-2 text-white" size={20} />
                  <p className="text-white text-sm">{label}</p>
                </div>
              ))}
            </div>
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
              ? <><Loader2 size={18} className="animate-spin" /> Creating account...</>
              : "Sign Up"
            }
          </button>

          <p className="text-slate-400 text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:underline">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
