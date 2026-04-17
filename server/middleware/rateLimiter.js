const rateLimit = require("express-rate-limit");
const logger = require("../config/logger");

// ── Helper: log when someone hits a rate limit ────────────────────────────────
const onLimitReached = (req, res, options) => {
  logger.warn(`Rate limit hit: IP=${req.ip} | Path=${req.path} | Limit=${options.max}`);
};

// ── 1. Global limiter — all /api routes ──────────────────────────────────────
//    100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,  // Return limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again after 15 minutes.",
  },
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(options.statusCode).json(options.message);
  },
});

// ── 2. Auth limiter — stricter, prevents brute-force on login/register ────────
//    10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes.",
  },
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(options.statusCode).json(options.message);
  },
});

// ── 3. Upload limiter — prevents file upload abuse ────────────────────────────
//    20 uploads per hour per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Upload limit reached, please try again after 1 hour.",
  },
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { globalLimiter, authLimiter, uploadLimiter };
