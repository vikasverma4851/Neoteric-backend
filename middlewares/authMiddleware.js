const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();
// exports.protect = async (req, res, next) => {
//   let token = req.headers.authorization?.split(" ")[1];
//   if (!token)
//     return res.status(401).json({ message: "Not authorized, no token" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id).select("-pswd");

//     // Check if user account is blacklisted
//     if (user.accountStatus === "blacklisted") {
//       return res.status(401).json({
//         message: "Your account is blacklisted. Please contact support.",
//       });
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     res.status(401).json({ message: "Token invalid or expired" });
//   }
// };

// Role-Based Access

exports.protect = async (req, res, next) => {
  // 1. Handle malformed authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Not authorized, invalid token format" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Check if user exists in database
    const user = await User.findById(decoded.id).select("-pswd"); // 4. Fixed field name
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.accountStatus === "blacklisted") {
      return res.status(401).json({
        message: "Your account is blacklisted. Please contact support.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // 3. Provide more specific error messages
    const message =
      error.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    res.status(401).json({ message });
  }
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // 3. Ensure user exists before checking role
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
