const PaymentReconciliation = require("../models/PaymentReconciliation");
const Booking = require("../models/Booking");
const EMI = require("../models/EMI");

exports.createPaymentReconciliation = async (req, res) => {
  try {
    const { bookingId, paymentReconciliations } = req.body;
    const createdBy = req?.user?._id;

    if (!bookingId || !paymentReconciliations || !Array.isArray(paymentReconciliations) || paymentReconciliations.length === 0) {
      return res.status(400).json({ message: "Invalid reconciliation data." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const emi = await EMI.findOne({ bookingId });
    if (!emi) {
      return res.status(404).json({ message: "EMI not found for this booking." });
    }

    const paymentReconciliationRecords = [];

    for (const paymentReconciliation of paymentReconciliations) {
      const { installmentNo, todayReceiving, utr, bankDetail, receivedDate } = paymentReconciliation;

      if (!installmentNo || todayReceiving === undefined || !receivedDate) {
        return res.status(400).json({ message: `Incomplete paymentReconciliation data for installment ${installmentNo}.` });
      }

      if (todayReceiving < 0) {
        return res.status(400).json({ message: `Amount receiving cannot be negative for installment ${installmentNo}.` });
      }

      const installment = emi.installments.find(inst => inst.installmentNo === installmentNo);
      if (!installment) {
        return res.status(404).json({ message: `Installment ${installmentNo} not found.` });
      }

      // Calculate total already received for this installment
      const previouspaymentReconciliations = await PaymentReconciliation.aggregate([
        { $match: { emiId: emi._id, installmentNo } },
        { $group: { _id: null, totalReceived: { $sum: "$todayReceiving" } } },
      ]);
      const previouslyReceived = previouspaymentReconciliations[0]?.totalReceived || 0;
      const newTotalReceived = previouslyReceived + todayReceiving;

      if (newTotalReceived > installment.amount) {
        return res.status(400).json({
          message: `paymentReconciliation exceeds installment amount for installment ${installmentNo}. Allowed: ${installment.amount}, Attempted Total: ${newTotalReceived}`,
        });
      }

      // Mark installment as paid if fully received, else keep as pending
      installment.paid = newTotalReceived === installment.amount;

      // Record paymentReconciliation
      paymentReconciliationRecords.push({
        bookingId,
        emiId: emi._id,
        installmentNo,
        todayReceiving,
        utr,
        bankDetail,
        receivedDate,
        createdBy,
      });
    }

    // Insert all paymentReconciliation records in one go
    await PaymentReconciliation.insertMany(paymentReconciliationRecords);

    // Save updated EMI installment paid statuses
    await emi.save();

    res.status(201).json({
      success: true,
      message: "paymentReconciliation reconciliation recorded successfully.",
      paymentReconciliations: paymentReconciliationRecords,
      emi,
    });
  } catch (error) {
    console.error("Error during paymentReconciliation reconciliation:", error);
    res.status(500).json({ message: "Server error during paymentReconciliation reconciliation." });
  }
};
