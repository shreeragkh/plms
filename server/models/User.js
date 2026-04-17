const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    email:          { type: String, required: true, unique: true, trim: true, lowercase: true },
    password:       { type: String, required: true, select: false },
    role:           { type: String, enum: ["student", "teacher", "admin"], required: true },
    department:     { type: String, trim: true, default: "" },
    yearOrSemester: { type: String, trim: true, default: "" },
    isActive:       { type: Boolean, default: true },
    isApproved:     { type: Boolean, default: false }, // admin must approve before login
  },
  { timestamps: true }
);

// Mongoose model name matches teammate: "users"
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("users", userSchema);
