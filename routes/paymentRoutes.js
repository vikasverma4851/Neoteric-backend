// routes/paymentRoutes.js

const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.post("/receive-payment", protect, paymentController.receivePayment);
router.get("/all-payments",protect, paymentController.getAllPayments);
router.get("/payments/:taskId",protect, paymentController.getPaymentsByTaskId);
router.get("/get-fully-received-pt2",protect, paymentController.getFullyReceivedPaymentType2);
router.get("/get-fully-received-pt2-emi",protect, paymentController.getFullyReceivedPaymentType2WithEMICreated);

module.exports = router;
