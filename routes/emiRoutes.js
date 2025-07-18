const express = require("express");
const router = express.Router();
const { createEMI, updateEMI,getEMIByBookingId,getPendingInstallments } = require("../controllers/emiController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");


router.post("/create", protect, createEMI);
router.post("/update", protect, updateEMI);
router.get("/by-booking/:bookingId", protect, getEMIByBookingId);
router.get("/pending-installments", getPendingInstallments);


module.exports = router;
