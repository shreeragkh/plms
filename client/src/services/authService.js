import API from "./api";

const authService = {
  // Register new user
  register: async ({ name, email, password, role }) => {
    const { data } = await API.post("/auth/register", { name, email, password, role });
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    return data;
  },

  // Login
  login: async ({ email, password }) => {
    const { data } = await API.post("/auth/login", { email, password });
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    return data;
  },

  // Logout - clear local storage
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Get current user from token
  getMe: async () => {
    const { data } = await API.get("/auth/me");
    return data.user;
  },

  // Get stored user without API call
  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => !!localStorage.getItem("token"),
};

export default authService;
