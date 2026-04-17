const Material = require("../models/Material");
const Course = require("../models/Course");
const { getFileType } = require("../middleware/uploadMiddleware");
const logActivity = require("../utils/logActivity");
const fs = require("fs");
const path = require("path");
const cache = require("../utils/cache");
const rabbitmq = require("../utils/rabbitmq");

// @GET /api/v1/materials/course/:courseId
const getMaterialsByCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const cacheKey = `materials_course_${courseId}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return res.json({ success: true, count: cached.length, materials: cached });
    }

    const dbStart = Date.now();
    const materials = await Material.find({ courseId })
      .populate("teacherId", "name")
      .sort({ uploadedAt: -1 })
      .lean();
    const dbDuration = Date.now() - dbStart;
    console.log(`[Database] 🗄️ FETCHED from MongoDB — Course: ${courseId} | Time: ${dbDuration}ms`);

    await cache.set(cacheKey, materials);
    res.json({ success: true, count: materials.length, materials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/materials/:id
const getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id).populate("teacherId", "name");
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });
    res.json({ success: true, material });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/v1/materials/upload — Teacher uploads file
const uploadMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded — check file type is supported (PDF, DOC, PPT, image, video)",
      });
    }

    const { courseId, title, description } = req.body;
    const course = await Course.findById(courseId);

    if (!course) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const material = await Material.create({
      courseId,
      teacherId: req.user._id,
      title: title || req.file.originalname,
      description: description || "",
      fileUrl: `/uploads/materials/${req.file.filename}`,
      fileType: getFileType(req.file.mimetype),
    });

    await logActivity(req.user, "uploaded_material", "Material", material._id, {
      title: material.title,
      courseId,
    });

    // Invalidate Redis cache
    await cache.del(`materials_course_${courseId}`);

    // Publish event to RabbitMQ (async, non-blocking)
    rabbitmq.publishEvent("material_uploaded", {
      materialId: material._id,
      title: material.title,
      courseId,
      teacherId: req.user._id
    });

    res.status(201).json({ success: true, material });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/v1/materials/:id
const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });

    if (material.teacherId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const filePath = path.join(__dirname, "..", material.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await Material.findByIdAndDelete(req.params.id);
    await logActivity(req.user, "deleted_material", "Material", req.params.id);

    // Invalidate Redis cache
    await cache.del(`materials_course_${material.courseId}`);

    res.json({ success: true, message: "Material deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getMaterialsByCourse, getMaterial, uploadMaterial, deleteMaterial };
