const express  = require("express");
const cors     = require("cors");
const morgan   = require("morgan");
const dotenv   = require("dotenv");
const connectDB  = require("./config/db");
const logger     = require("./config/logger");
const { globalLimiter, authLimiter } = require("./middleware/rateLimiter");

dotenv.config();
connectDB();

const app = express();

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan("combined", {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.url === "/api/v1/health",
}));

// ── Security ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use("/api/v1", globalLimiter);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));
// Serve uploaded files — documents force download, videos/images open inline
const uploadsPath = require("path").join(__dirname, "uploads");
app.use("/uploads", require("express").static(uploadsPath, {
  setHeaders: (res, filePath) => {
    const lower = filePath.toLowerCase();
    const isDoc = lower.endsWith(".pdf")  || lower.endsWith(".doc")  ||
                  lower.endsWith(".docx") || lower.endsWith(".ppt")  ||
                  lower.endsWith(".pptx");
    if (isDoc) {
      const fname = require("path").basename(filePath);
      res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
      res.setHeader("Content-Type", "application/octet-stream");
    }
  },
}));

// ── Routes  (all under /api/v1) ───────────────────────────────────────────────
app.use("/api/v1/auth",                    authLimiter, require("./routes/authRoutes"));
app.use("/api/v1/users",                               require("./routes/userRoutes"));
app.use("/api/v1/courses",                             require("./routes/courseRoutes"));
app.use("/api/v1/enrollments",                         require("./routes/enrollmentRoutes"));
app.use("/api/v1/materials",                           require("./routes/materialRoutes"));
app.use("/api/v1/quizzes",                             require("./routes/quizRoutes"));
app.use("/api/v1/quiz-attempts",                       require("./routes/quizAttemptRoutes"));
app.use("/api/v1/assignments",                         require("./routes/assignmentRoutes"));
app.use("/api/v1/assignment-submissions",              require("./routes/assignmentSubmissionRoutes"));
app.use("/api/v1/chat",                                require("./routes/chatRoutes"));
app.use("/api/v1/activity-logs",                       require("./routes/activityLogRoutes"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", api: "v1", timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn(`404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`${err.message} | ${err.stack}`);
  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
  });
});

// ── RabbitMQ Publisher ────────────────────────────────────────────────────────
// amqplib connects on require; events are published from materialController.js
const rabbitmq = require("./utils/rabbitmq");

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  logger.info(`API: http://localhost:${PORT}/api/v1`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await rabbitmq.close();
    process.exit(0);
  });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

