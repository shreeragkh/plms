/**
 * QUIZ MICROSERVICE — port 5004
 * Handles: /api/v1/quizzes, /api/v1/quiz-attempts, /api/v1/assignments, /api/v1/assignment-submissions
 * Concurrency: Optimistic locking on QuizAttempt + unique index on AssignmentSubmission
 */
const express   = require("express");
const cors      = require("cors");
const morgan    = require("morgan");
const dotenv    = require("dotenv");
const connectDB = require("./config/db");
const { globalLimiter } = require("./middleware/rateLimiter");

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

// Serve uploaded files statically
const path = require("path");
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    const lower = filePath.toLowerCase();
    const isDoc = lower.endsWith(".pdf")  || lower.endsWith(".doc")  ||
                  lower.endsWith(".docx") || lower.endsWith(".ppt")  ||
                  lower.endsWith(".pptx");
    if (isDoc) {
      const fname = path.basename(filePath);
      res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
      res.setHeader("Content-Type", "application/octet-stream");
    }
  },
}));

// Log every request handled by this service
app.use((req, res, next) => {
  console.log(`[Quiz Service] ⚙️  Handling request: ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/health", (req, res) => res.json({ service: "quiz-service", status: "ok", port: 5004 }));

// Routes
app.use("/quizzes",                globalLimiter, require("./routes/quizRoutes"));
app.use("/quiz-attempts",          globalLimiter, require("./routes/quizAttemptRoutes"));
app.use("/assignments",            globalLimiter, require("./routes/assignmentRoutes"));
app.use("/assignment-submissions", globalLimiter, require("./routes/assignmentSubmissionRoutes"));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found — Quiz Service" }));

// Error handler — catches optimistic concurrency VersionError
app.use((err, req, res, next) => {
  if (err.name === "VersionError") {
    return res.status(409).json({
      success: false,
      message: "Conflict: data was modified by another request. Please retry.",
    });
  }
  res.status(err.statusCode || 500).json({ success: false, message: err.message });
});

const PORT = 5004;
app.listen(PORT, () => {
  console.log(`📝 Quiz Service running on port ${PORT}`);
});
