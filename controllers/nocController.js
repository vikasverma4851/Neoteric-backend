const Booking = require("../models/Booking");
const EMI = require("../models/EMI");
const NOCHistory = require("../models/NOCHistory");
const PaymentReconciliation = require("../models/PaymentReconciliation");


// POST /api/noc/proceed
exports.proceedToNoDue = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required." });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.proceedToNoDue) {
      return res.status(400).json({ message: "Already proceeded to No Due." });
    }

    booking.proceedToNoDue = true;
    await booking.save();

    res.status(200).json({ message: "Booking proceeded to No Due successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to proceed to No Due.", error: error.message });
  }
};


// GET /api/noc/bookings
exports.getBookingsForNOC = async (req, res) => {
  try {
    // ✅ Fetch only bookings where nocGranted is false
    const bookings = await Booking.find({ nocGranted: false,
      status: "active",  proceedToNoDue: true, }).lean();

    // Fetch total received per bookingId using aggregation
    const payments = await PaymentReconciliation.aggregate([
      {
        $group: {
          _id: "$bookingId",
          totalReceived: { $sum: "$todayReceiving" },
        },
      },
    ]);

    const paymentMap = {};
    payments.forEach((payment) => {
      paymentMap[payment._id.toString()] = payment.totalReceived;
    });

    const result = bookings.map((booking) => {
      const bookingIdStr = booking._id.toString();
      const emiAmount = booking.paymentType1 || 0; // ✅ Use paymentType1
      const amountReceived = paymentMap[bookingIdStr] || 0;
      const balance = emiAmount - amountReceived; // ✅ Based on paymentType1

      return {
        bookingId: booking._id,
        taskId: booking.taskId,
        clientId: booking.clientName,
        name: booking.projectName,
        emiAmount,
        amountReceived,
        balance,
        remarks: booking.nocRemarks || "",
        noDue: false, // frontend will toggle
        nocGranted: booking.nocGranted || false,
        mobile: booking.mobile || "",
        projectType: booking.projectType,
        tower: booking.tower,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch bookings for NOC", error: error.message });
  }
};





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
      .populate("bookingId", "projectName projectType clientName mobile taskId")
      .populate("grantedBy", "name email role") // Assuming User model has these
      .sort({ createdAt: -1 });

    res.status(200).json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch NOC history", error: error.message });
  }
};
