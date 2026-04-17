/**
 * One-time migration: set isApproved = true on all existing users
 * who don't have the field yet (created before the approval feature).
 *
 * Run once: node migrate-approve-existing.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User     = require("./models/User");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const result = await User.updateMany(
    { isApproved: { $exists: false } },
    { $set: { isApproved: true } }
  );

  console.log(`Migration complete: ${result.modifiedCount} users updated to isApproved = true`);
  await mongoose.disconnect();
})();
