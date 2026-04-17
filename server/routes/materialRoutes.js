const express = require("express");
const router = express.Router();
const { getMaterialsByCourse, getMaterial, uploadMaterial, deleteMaterial } = require("../controllers/materialController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");
const { uploadLimiter } = require("../middleware/rateLimiter");
const { mongoIdParam, validate } = require("../middleware/validators");

router.use(protect);

router.get("/course/:courseId", mongoIdParam("courseId"), validate, getMaterialsByCourse);
router.get("/:id",              mongoIdParam("id"),       validate, getMaterial);
router.post("/upload",          authorize("teacher", "admin"), uploadLimiter, upload.single("file"), uploadMaterial);
router.delete("/:id",           authorize("teacher", "admin"), mongoIdParam("id"), validate, deleteMaterial);

module.exports = router;
