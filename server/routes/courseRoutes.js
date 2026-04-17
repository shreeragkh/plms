const express = require("express");
const router = express.Router();
const { getAllCourses, getMyCourses, getCourse, createCourse, updateCourse, updateCourseStatus, deleteCourse, getCourseStudents } = require("../controllers/courseController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { courseRules, mongoIdParam, validate } = require("../middleware/validators");

router.use(protect);

router.route("/")
  .get(getAllCourses)
  .post(authorize("teacher", "admin"), courseRules, validate, createCourse);

router.get("/my", authorize("teacher", "admin"), getMyCourses);

router.route("/:id")
  .get(mongoIdParam("id"), validate, getCourse)
  .put(authorize("teacher", "admin"), mongoIdParam("id"), validate, updateCourse)
  .delete(authorize("teacher", "admin"), mongoIdParam("id"), validate, deleteCourse);

router.put("/:id/status",   authorize("teacher", "admin"), mongoIdParam("id"), validate, updateCourseStatus);
router.get("/:id/students", authorize("teacher", "admin"), mongoIdParam("id"), validate, getCourseStudents);

module.exports = router;
