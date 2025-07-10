const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const EMI = require("../models/EMI");

const PaymentReconciliation = require("../models/PaymentReconciliation");


exports.createEMI = async (req, res) => {
  try {
    const { bookingId, installments } = req.body;
    const createdBy = req.user._id;

    if (!bookingId || !installments || !Array.isArray(installments) || installments.length === 0) {
      return res.status(400).json({ message: "Missing or invalid data for EMI creation." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // Check eligibility: Payment Type 2 must be fully received or zero
    let totalPaymentType2Received = 0;
    if (booking.paymentType2 !== 0) {
      const payments = await Payment.aggregate([
        { $match: { bookingId: booking._id, paymentType: "Payment Type 2" } },
        { $group: { _id: null, totalReceived: { $sum: "$todayReceiving" } } },
      ]);
      totalPaymentType2Received = payments[0]?.totalReceived || 0;

      if (totalPaymentType2Received < booking.paymentType2) {
        return res.status(400).json({ message: "Cannot create EMI. Payment Type 2 is not fully received." });
      }
    }

    // EMI is created on paymentType1 amount only
    const totalEMIAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);
    if (totalEMIAmount > booking.paymentType1) {
      return res.status(400).json({ message: `Total EMI amount (${totalEMIAmount}) cannot exceed Payment Type 1 amount (${booking.paymentType1}).` });
    }

    const emi = new EMI({
      bookingId,
      installments,
      createdBy,
    });

    await emi.save();

    res.status(201).json({
      success: true,
      message: "EMI created successfully on Payment Type 1.",
      emi,
    });
  } catch (error) {
    console.error("Error creating EMI:", error);
    res.status(500).json({ success: false, message: "Server error while creating EMI." });
  }
};




exports.updateEMI = async (req, res) => {
  try {
    const { emiId, installments } = req.body;
    const updatedBy = req.user._id;

    if (!emiId || !installments || !Array.isArray(installments)) {
      return res.status(400).json({ message: "Invalid data for EMI update." });
    }

    const emi = await EMI.findById(emiId);
    if (!emi) {
      return res.status(404).json({ message: "EMI record not found." });
    }

    // Validate total EMI amount does not exceed booking.paymentType1
    const booking = await Booking.findById(emi.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found for this EMI." });
    }

    const totalUpdatedAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);
    if (totalUpdatedAmount > booking.paymentType1) {
      return res.status(400).json({
        message: `Total EMI amount (${totalUpdatedAmount}) exceeds allowed Payment Type 1 (${booking.paymentType1}).`,
      });
    }

    emi.installments = installments;
    await emi.save();

    res.status(200).json({
      success: true,
      message: "EMI updated successfully.",
      emi,
    });
  } catch (error) {
    console.error("Error updating EMI:", error);
    res.status(500).json({ message: "Server error while updating EMI." });
  }
};


// // GET /api/emi/by-booking/:bookingId
// exports.getEMIByBookingId = async (req, res) => {
//   try {
//     const { bookingId } = req.params;

//     // Check if the booking exists
//     const booking = await Booking.findById(bookingId);
//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found." });
//     }

//     // Find EMI document linked to this booking
//     const emi = await EMI.findOne({ bookingId: bookingId });
//     if (!emi) {
//       return res.status(404).json({ message: "EMI record not found for this booking." });
//     }

//     res.status(200).json({ emi });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error while fetching EMI." });
//   }
// };

// In your emi controller


exports.getEMIByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const emi = await EMI.findOne({ bookingId });
    if (!emi) {
      return res.status(404).json({ message: "EMI not found for this booking." });
    }

    // Aggregate received amounts for each installmentNo
    const receivedData = await PaymentReconciliation.aggregate([
      { $match: { emiId: emi._id } },
      { $group: { _id: "$installmentNo", totalReceived: { $sum: "$todayReceiving" } } }
    ]);

    const receivedMap = {};
    receivedData.forEach(item => {
      receivedMap[item._id] = item.totalReceived;
    });

    // Attach received data to each installment
    const installmentsWithReceived = emi.installments.map(inst => ({
      ...inst.toObject(),
      totalReceived: receivedMap[inst.installmentNo] || 0,
      balance: inst.amount - (receivedMap[inst.installmentNo] || 0),
    }));

    res.json({
      success: true,
      emi: {
        ...emi.toObject(),
        installments: installmentsWithReceived,
      },
    });
  } catch (error) {
    console.error("Error fetching EMI by booking:", error);
    res.status(500).json({ message: "Server error while fetching EMI." });
  }
};


