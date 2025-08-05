const express = require("express");
const router = express.Router();
const projectReportController  = require("../controllers/reportsController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/project-report", protect, projectReportController.getProjectReport);
router.get("/emi-report", protect, projectReportController.getEmiReport);
router.get("/installment-report", protect, projectReportController.getInstallmentReport);

module.exports = router;