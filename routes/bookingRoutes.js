const express = require("express");
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  updateBookingStatus,
} = require("../controllers/bookingController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.post("/", protect, createBooking);
router.get("/", protect, getAllBookings);
router.patch("/:id/status", protect, updateBookingStatus);

module.exports = router;
