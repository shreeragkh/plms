import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a route and redirects unauthorized users.
 *
 * Usage:
 *   <ProtectedRoute roles={["teacher", "admin"]}>
 *     <TeacherDashboard />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  // Not logged in → go to login, remember where they came from
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role
  if (roles && !roles.includes(user.role)) {
    const redirectMap = {
      student: "/student",
      teacher: "/teacher/dashboard",
      admin: "/admin",
    };
    return <Navigate to={redirectMap[user.role] || "/"} replace />;
  }

  return children;
}
