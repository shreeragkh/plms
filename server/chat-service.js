/**
 * CHAT MICROSERVICE — port 5005
 * Handles: /api/v1/chat
 * AI-powered conversational interface
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

// Log every request handled by this service
app.use((req, res, next) => {
  console.log(`[Chat Service] ⚙️  Handling request: ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/health", (req, res) => res.json({ service: "chat-service", status: "ok", port: 5005 }));

// Routes
app.use("/chat", globalLimiter, require("./routes/chatRoutes"));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found — Chat Service" }));

// Error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ success: false, message: err.message });
});

const PORT = 5005;
app.listen(PORT, () => {
  console.log(`💬 Chat Service running on port ${PORT}`);
});
