const express = require("express");
const router = express.Router();
const { createEMI, updateEMI,getEMIByBookingId } = require("../controllers/emiController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");


router.post("/create", protect, createEMI);
router.post("/update", protect, updateEMI);
router.get("/by-booking/:bookingId", protect, getEMIByBookingId);


module.exports = router;
