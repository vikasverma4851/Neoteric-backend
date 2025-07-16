const express = require("express");
const { createPaymentReconciliation,getReconciliationsByEmiId } = require("../controllers/PaymentReconciliationController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

// POST /api/payments/reconcile
router.post("/reconcile",protect ,createPaymentReconciliation);
// New route
router.get("/reconciliations/:emiId", getReconciliationsByEmiId);

module.exports = router;
