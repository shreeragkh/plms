import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing          from "./pages/Landing";
import Login            from "./pages/Login";
import Signup           from "./pages/Signup";
import AdminDashboard   from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import RecommendationsPage from "./pages/Recommendations";
import CreateQuiz       from "./pages/CreateQuiz";
import UploadContent    from "./pages/UploadContent";
import Analytics        from "./pages/Analytics";
import TakeQuiz         from "./pages/TakeQuiz";
import BrowseCourses    from "./pages/BrowseCourses";
import ManageAssignments from "./pages/ManageAssignments";

function AuthRedirect({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  const map = { student: "/student", teacher: "/teacher/dashboard", admin: "/admin" };
  return <Navigate to={map[user.role] || "/"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login"  element={<AuthRedirect><Login /></AuthRedirect>} />
      <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />

      {/* Student */}
      <Route path="/student" element={
        <ProtectedRoute roles={["student"]}><StudentDashboard /></ProtectedRoute>
      } />
      <Route path="/recommendations" element={
        <ProtectedRoute roles={["student"]}><RecommendationsPage /></ProtectedRoute>
      } />
      <Route path="/quiz/:quizId" element={
        <ProtectedRoute roles={["student"]}><TakeQuiz /></ProtectedRoute>
      } />
      <Route path="/browse-courses" element={
        <ProtectedRoute roles={["student"]}><BrowseCourses /></ProtectedRoute>
      } />

      {/* Teacher */}
      <Route path="/teacher/dashboard" element={
        <ProtectedRoute roles={["teacher"]}><TeacherDashboard /></ProtectedRoute>
      } />
      <Route path="/create-quiz" element={
        <ProtectedRoute roles={["teacher"]}><CreateQuiz /></ProtectedRoute>
      } />
      <Route path="/upload" element={
        <ProtectedRoute roles={["teacher"]}><UploadContent /></ProtectedRoute>
      } />
      <Route path="/teacher/assignments" element={
        <ProtectedRoute roles={["teacher"]}><ManageAssignments /></ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute roles={["teacher", "admin"]}><Analytics /></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
