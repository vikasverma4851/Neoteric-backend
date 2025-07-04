const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobileNo: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    // location: { type: String, required: true },
    pswd: { type: String, required: true },
    role: {
      type: String,
      enum: [
        "admin",
        "vp sales",
        "sales manager",
        "bba drafter",
        "accounts officer 1",
        "accounts officer 2",
        "emi reco dept",
      ],
      required: true,
    },
    accountStatus: {
      type: String,
      enum: ["active", "blacklisted"],
      default: "active",
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastForgotPasswordRequest: { type: Date },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("pswd")) return next();
  const salt = await bcrypt.genSalt(10);
  this.pswd = await bcrypt.hash(this.pswd, salt);
  next();
});

module.exports = mongoose.model("User", userSchema);
