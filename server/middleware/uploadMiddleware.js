const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

// Use absolute paths based on server root — works regardless of where node is launched from
const SERVER_ROOT = path.join(__dirname, "..");

const DIRS = {
  materials:   path.join(SERVER_ROOT, "uploads", "materials"),
  assignments: path.join(SERVER_ROOT, "uploads", "assignments"),
};

// Create directories if they don't exist
Object.values(DIRS).forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = req.baseUrl.includes("assignment") ? DIRS.assignments : DIRS.materials;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg", "image/png", "image/gif",
    "video/mp4", "video/webm",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not supported: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const getFileType = (mimetype) => {
  if (mimetype === "application/pdf")   return "pdf";
  if (mimetype.includes("word"))        return "doc";
  if (mimetype.includes("powerpoint") || mimetype.includes("presentation")) return "ppt";
  if (mimetype.startsWith("image/"))   return "image";
  if (mimetype.startsWith("video/"))   return "video";
  return "other";
};

module.exports = { upload, getFileType };
