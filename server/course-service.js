/**
 * COURSE MICROSERVICE — port 5003
 * Handles: /api/v1/courses, /api/v1/materials, /api/v1/enrollments, /api/v1/activity-logs
 * Publishes: material_uploaded → RabbitMQ
 * Cache: Redis (materials by course)
 */
const express   = require("express");
const cors      = require("cors");
const morgan    = require("morgan");
const dotenv    = require("dotenv");
const path      = require("path");
const connectDB = require("./config/db");
const { globalLimiter, uploadLimiter } = require("./middleware/rateLimiter");

dotenv.config();
connectDB();

// Start RabbitMQ publisher connection
require("./utils/rabbitmq");

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
  console.log(`[Course Service] ⚙️  Handling request: ${req.method} ${req.url}`);
  next();
});

// Serve uploaded files
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

// Health check
app.get("/health", (req, res) => res.json({ service: "course-service", status: "ok", port: 5003 }));

// Routes — Mounted on explicit paths to match gateway stripping
app.use("/courses",       globalLimiter, require("./routes/courseRoutes"));
app.use("/materials",     uploadLimiter, require("./routes/materialRoutes"));
app.use("/enrollments",   globalLimiter, require("./routes/enrollmentRoutes"));
app.use("/activity-logs", globalLimiter, require("./routes/activityLogRoutes"));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found — Course Service" }));

// Error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ success: false, message: err.message });
});

const PORT = 5003;
app.listen(PORT, () => {
  console.log(`📚 Course Service running on port ${PORT}`);
});
