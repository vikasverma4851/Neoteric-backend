const Booking = require("../models/Booking");

exports.createBooking = async (req, res) => {
  try {
    const { projectName, projectType, clientName, unit, ...rest } = req.body;

    // Generate clean, consistent taskId
    const taskId = `${projectName.trim()}/${projectType.trim()}/${unit.trim()}/${clientName.trim()}`;

    const booking = new Booking({
      projectName,
      projectType,
      clientName,
      unit,
      taskId, // 👈 auto-set
      ...rest,
    });

    await booking.save();
    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ timestamp: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update booking status (Cancel / Active)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
