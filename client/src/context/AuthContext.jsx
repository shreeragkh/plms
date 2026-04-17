import { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [initializing, setInitializing] = useState(true); // NEW: prevents flash

  // On first load — check if a stored token is still valid
  useEffect(() => {
    const init = async () => {
      if (authService.isAuthenticated()) {
        try {
          const u = await authService.getMe();
          setUser(u);
        } catch {
          // Token expired or server down — clear it silently
          authService.logout();
          setUser(null);
        }
      }
      setInitializing(false);
    };
    init();
  }, []);

  const register = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.register(formData);
      if (!data.pending) setUser(data.user);
      return data;
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(credentials);
      setUser(data.user);
      return data;
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // Show a simple loader while we verify the token on first load
  // This prevents the brief flash to /login then redirect
  if (initializing) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#94a3b8",
        fontSize: "14px",
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
