const Booking = require("../models/Booking");
const EMI = require("../models/EMI");
const NOCHistory = require("../models/NOCHistory");

exports.grantNOC = async (req, res) => {
  try {
    const { bookingId, remarks } = req.body;
    const userId = req.user._id; // assuming JWT middleware adds req.user

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.nocGranted) {
      return res.status(400).json({ message: "NOC already granted for this booking." });
    }

    // Optional: Check for pending installments
    const emiRecord = await EMI.findOne({ bookingId });
    let pendingAmount = 0;

    if (emiRecord) {
      emiRecord.installments.forEach(inst => {
        if (!inst.paid) {
          pendingAmount += inst.balance;
        }
      });
    }

    // Log pending if any, but allow force grant
    if (pendingAmount > 0) {
      console.log(`NOC granted with pending amount: ${pendingAmount}`);
    }

    // Update Booking
    booking.nocGranted = true;
    booking.nocGrantedOn = new Date();
    booking.nocGrantedBy = userId;
    booking.nocRemarks = remarks;
    await booking.save();

    // Save in NOCHistory
    await NOCHistory.create({
      bookingId,
      clientId: booking.clientName,
      grantedBy: userId,
      remarks,
      status: "Granted",
    });

    res.status(200).json({ message: "NOC granted successfully", pendingAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to grant NOC", error: error.message });
  }
};


// Get all NOC history, optionally filter by clientId or bookingId
exports.getNOCHistory = async (req, res) => {
  try {
    const { clientId, bookingId } = req.query;
    const filter = {};

    if (clientId) filter.clientId = clientId;
    if (bookingId) filter.bookingId = bookingId;

    const history = await NOCHistory.find(filter)
      .populate("bookingId", "projectName projectType clientName mobile")
      .populate("grantedBy", "name email role") // Assuming User model has these
      .sort({ createdAt: -1 });

    res.status(200).json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch NOC history", error: error.message });
  }
};
