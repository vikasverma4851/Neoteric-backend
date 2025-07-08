// routes/paymentRoutes.js

const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.post("/receive-payment", protect, paymentController.receivePayment);
router.get("/all-payments",protect, paymentController.getAllPayments);
router.get("/payments/:taskId",protect, paymentController.getPaymentsByTaskId);

module.exports = router;
