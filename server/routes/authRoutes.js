const express = require("express");
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { registerRules, loginRules, validate } = require("../middleware/validators");

router.post("/register", registerRules, validate, register);
router.post("/login",    loginRules,    validate, login);
router.get("/me",        protect, getMe);
router.put("/update-profile",   protect, updateProfile);
router.put("/change-password",  protect, changePassword);

module.exports = router;
