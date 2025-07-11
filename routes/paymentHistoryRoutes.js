const express = require("express");
const router = express.Router();
const paymentHistoryController = require("../controllers/paymentHistoryController");
const { protect ,authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, paymentHistoryController.getPaymentHistory);

module.exports = router;
