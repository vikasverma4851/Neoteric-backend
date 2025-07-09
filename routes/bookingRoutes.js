const express = require("express");
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  updateBookingStatus,
  updateBooking,
  deleteBooking
} = require("../controllers/bookingController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.post("/", protect, createBooking);
router.get("/", protect, getAllBookings);
router.patch("/:id/status", protect, updateBookingStatus);
// Update Booking by ID
router.put("/:id",protect, updateBooking);
router.delete("/:id",protect,deleteBooking );

module.exports = router;
