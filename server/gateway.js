const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");
const dotenv  = require("dotenv");
const { createProxyMiddleware } = require("http-proxy-middleware");

dotenv.config();

const app = express();

// ── Service registry ──────────────────────────────────────────────────────────
const SERVICES = {
  auth:         { url: "http://localhost:5001", label: "Auth Service"         },
  course:       { url: "http://localhost:5003", label: "Course Service"       },
  quiz:         { url: "http://localhost:5004", label: "Quiz Service"         },
  chat:         { url: "http://localhost:5005", label: "Chat Service"         },
  notification: { url: "http://localhost:5002", label: "Notification Service" },
};

// ── Route map: path prefix → target service ───────────────────────────────────
// We use these prefixes to route and then strip them from the path.
const ROUTE_MAP = [
  { prefix: "/api/v1/auth",                     target: SERVICES.auth.url         },
  { prefix: "/api/v1/users",                    target: SERVICES.auth.url         },
  { prefix: "/api/v1/courses",                  target: SERVICES.course.url       },
  { prefix: "/api/v1/materials",                target: SERVICES.course.url       },
  { prefix: "/api/v1/enrollments",              target: SERVICES.course.url       },
  { prefix: "/api/v1/activity-logs",            target: SERVICES.course.url       },
  { prefix: "/api/v1/quizzes",                  target: SERVICES.quiz.url         },
  { prefix: "/api/v1/quiz-attempts",            target: SERVICES.quiz.url         },
  { prefix: "/api/v1/assignments",              target: SERVICES.quiz.url         },
  { prefix: "/api/v1/assignment-submissions",   target: SERVICES.quiz.url         },
  { prefix: "/api/v1/chat",                     target: SERVICES.chat.url         },
  { prefix: "/api/v1/notifications",            target: SERVICES.notification.url },
  { prefix: "/uploads/assignments",             target: SERVICES.quiz.url         },
  { prefix: "/uploads",                         target: SERVICES.course.url       },
];

// ── Middleware ────────────────────────────────────────────────────────────────
// Allow both potential frontend ports
const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:5174"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(morgan("dev"));

// ── Health check — polls all services ────────────────────────────────────────
app.get("/health", async (req, res) => {
  const results = { gateway: "ok", timestamp: new Date().toISOString(), services: {} };

  await Promise.all(
    Object.entries(SERVICES).map(async ([key, svc]) => {
      try {
        const r = await fetch(`${svc.url}/health`, { signal: AbortSignal.timeout(2000) });
        results.services[svc.label] = r.ok ? "✅ ok" : `⚠️  HTTP ${r.status}`;
      } catch {
        results.services[svc.label] = "❌ unreachable";
      }
    })
  );

  const allOk = Object.values(results.services).every((s) => s.includes("ok"));
  res.status(allOk ? 200 : 207).json(results);
});

// ── Smart proxy with Path Stripping ───────────────────────────────────────────
// This configuration ensures that /api/v1/auth/login becomes /login when sent to the Auth Service.
app.use(
  createProxyMiddleware({
    changeOrigin: true,

    // Dynamically pick target
    router: (req) => {
      const path = req.url;
      
      // Explicit override for uploads to ensure correct microservice routing
      if (path.startsWith("/uploads/assignments")) {
        console.log(`[Gateway] 📂 Routing Assignment Upload: ${path} -> Quiz Service`);
        return SERVICES.quiz.url;
      }
      if (path.startsWith("/uploads")) {
        console.log(`[Gateway] 📂 Routing Course Upload: ${path} -> Course Service`);
        return SERVICES.course.url;
      }

      for (const route of ROUTE_MAP) {
        if (path.startsWith(route.prefix)) return route.target;
      }
      return null;
    },

    // Rewrite path to strip ONLY the /api/v1 prefix, preserving service context (e.g., /courses)
    pathRewrite: {
      "^/api/v1": "",
    },

    // Only proxy matched API routes
    filter: (pathname) => {
      if (pathname.startsWith("/uploads")) return true;
      for (const route of ROUTE_MAP) {
        if (pathname.startsWith(route.prefix)) return true;
      }
      return false;
    },

    on: {
      error: (err, req, res) => {
        console.error(`[Gateway] Proxy error: ${err.message}`);
        if (res && !res.headersSent) {
          res.status(502).json({ success: false, message: `Upstream service unavailable` });
        }
      },
    },
  })
);

// ── 404 for unmatched routes ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `No service handles: ${req.method} ${req.url}` });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🌐 API Gateway running on port ${PORT}`);
  console.log(`\n✅ CORS allowed origins: ${allowedOrigins.filter(Boolean).join(", ")}`);
  console.log(`\n📊 Service Map:`);
  Object.entries(SERVICES).forEach(([key, svc]) => {
    console.log(`   ${svc.label.padEnd(20)} → ${svc.url}`);
  });
  console.log(`\n🚀 System is ready for use!\n`);
});
