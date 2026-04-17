const { createLogger, format, transports } = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const { combine, timestamp, printf, colorize, errors } = format;

// ── Custom log format for console ────────────────────────────────────────────
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// ── Custom log format for files (JSON-like, easy to parse) ───────────────────
const fileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  return JSON.stringify({ timestamp, level, message: stack || message, ...meta });
});

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "info",

  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }) // capture full stack traces
  ),

  transports: [
    // ── Console: colorized, human-readable ──────────────────────────────────
    new transports.Console({
      format: combine(colorize(), consoleFormat),
    }),

    // ── File: all logs info+ ────────────────────────────────────────────────
    new transports.File({
      filename: path.join(logsDir, "app.log"),
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB per file
      maxFiles: 3,              // keep last 3 rotations
    }),

    // ── File: errors only ───────────────────────────────────────────────────
    new transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
});

module.exports = logger;
