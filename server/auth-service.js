/**
 * AUTH MICROSERVICE — port 5001
 * Handles: /api/v1/auth, /api/v1/users
 */
const express  = require("express");
const cors     = require("cors");
const morgan   = require("morgan");
const dotenv   = require("dotenv");
const connectDB = require("./config/db");
const { authLimiter, globalLimiter } = require("./middleware/rateLimiter");

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:5174"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));

// Log every request handled by this service
app.use((req, res, next) => {
  console.log(`[Auth Service] ⚙️  Handling request: ${req.method} ${req.url}`);
  next();
});

// Health check (used by API Gateway)
app.get("/health", (req, res) => res.json({ service: "auth-service", status: "ok", port: 5001 }));

// Routes
app.use("/auth",  authLimiter, require("./routes/authRoutes"));
app.use("/users", globalLimiter, require("./routes/userRoutes"));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found — Auth Service" }));

// Error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ success: false, message: err.message });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT}`);
});
