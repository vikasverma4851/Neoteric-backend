const express = require("express");
const { createPaymentReconciliation } = require("../controllers/PaymentReconciliationController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

// POST /api/payments/reconcile
router.post("/reconcile",protect ,createPaymentReconciliation);

module.exports = router;
