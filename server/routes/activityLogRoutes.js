const express = require("express");
const router = express.Router();
const { getAllLogs, getUserLogs, getSummary } = require("../controllers/activityLogController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { mongoIdParam, validate } = require("../middleware/validators");

router.use(protect, authorize("admin"));

router.get("/",                    getAllLogs);
router.get("/summary",             getSummary);
router.get("/user/:userId",        mongoIdParam("userId"), validate, getUserLogs);

module.exports = router;
