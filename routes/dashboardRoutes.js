const express = require("express");
const router = express.Router();
const {
 getDashboardStats
} = require("../controllers/dashboardController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");




router.get("/dashboard",  getDashboardStats);


module.exports = router;