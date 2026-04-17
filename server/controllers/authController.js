const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logActivity = require("../utils/logActivity");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "7d" });

// @POST /api/v1/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, department, yearOrSemester } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const safeRole   = role || "student";
    // Admins are auto-approved; students and teachers need admin approval
    const isApproved = safeRole === "admin";

    const user = await User.create({ name, email, password, role: safeRole, department, yearOrSemester, isApproved });

    await logActivity(user, "registered", "User", user._id, { role: safeRole });

    if (!isApproved) {
      return res.status(201).json({
        success: true,
        pending: true,
        message: "Account created. Please wait for admin approval before logging in.",
      });
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/v1/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    // isApproved === false (explicitly) means pending; undefined/null = legacy user, allow through
    if (user.isApproved === false) {
      return res.status(401).json({ success: false, message: "Your account is pending admin approval. Please wait." });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: "Account deactivated. Contact admin." });
    }

    await logActivity(user, "logged_in", "User", user._id);

    res.json({
      success: true,
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/v1/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @PUT /api/v1/auth/update-profile
const updateProfile = async (req, res) => {
  try {
    const { name, department, yearOrSemester } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, department, yearOrSemester },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @PUT /api/v1/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword};
