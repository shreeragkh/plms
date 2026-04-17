const express = require("express");
const router = express.Router();
const { getAssignmentsByCourse, getAssignment, createAssignment, updateAssignment, deleteAssignment } = require("../controllers/assignmentController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { mongoIdParam, validate } = require("../middleware/validators");

router.use(protect);

router.get("/course/:courseId",  mongoIdParam("courseId"), validate, getAssignmentsByCourse);
router.post("/",                 authorize("teacher", "admin"), createAssignment);
router.route("/:id")
  .get(mongoIdParam("id"),     validate, getAssignment)
  .put(authorize("teacher", "admin"), mongoIdParam("id"), validate, updateAssignment)
  .delete(authorize("teacher", "admin"), mongoIdParam("id"), validate, deleteAssignment);

module.exports = router;
