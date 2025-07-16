const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const EMI = require("../models/EMI");
const PaymentReconciliation = require("../models/PaymentReconciliation");

// Calculate 2% per month as 0.02/30 per day accurately
const calculateInterest = (amount, fromDate, toDate) => {
  const from = new Date(fromDate);
  const to = new Date(toDate || new Date());

  const diffTime = to - from;
  const daysLate = diffTime / (1000 * 60 * 60 * 24);

  if (daysLate <= 0) return 0;

  const dailyRate = 0.02 / 30; // ~0.0006667 per day
  const interest = Math.round(amount * dailyRate * daysLate);

  console.log({
    amount,
    fromDate,
    toDate,
    daysLate,
    dailyRate,
    interest
  });

  return interest;
};

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

    // Validate and calculate interest for installments
    const validatedInstallments = await Promise.all(installments.map(async (inst) => {
      if (!inst.installmentNo || !inst.amount) {
        throw new Error(`Invalid installment data: installmentNo and amount are required.`);
      }
      if (inst.isSubInstallment && (!inst.parentDueDate || !inst.commitmentDate)) {
        throw new Error(`Sub-installment ${inst.installmentNo} must have parentDueDate and commitmentDate.`);
      }
      if (inst.isSubInstallment && inst.dueDate) {
        throw new Error(`Sub-installment ${inst.installmentNo} cannot have a dueDate.`);
      }

      let interest;
      if (inst.isSubInstallment) {
        // For sub-installments, use the main installment's latest receivedDate
        const mainInstallmentNo = inst.installmentNo.split("-")[0];
        const mainReconciliation = await PaymentReconciliation.findOne(
          { bookingId, installmentNo: mainInstallmentNo, isSubInstallment: false },
          { receivedDate: 1 },
          { sort: { receivedDate: -1 } }
        );
        const interestStartDate = mainReconciliation ? mainReconciliation.receivedDate : inst.parentDueDate;
        interest = calculateInterest(inst.amount, interestStartDate, inst.commitmentDate || new Date());
      } else {
        interest = calculateInterest(inst.amount, inst.dueDate, new Date());
      }

      return {
        installmentNo: String(inst.installmentNo),
        amount: inst.amount,
        dueDate: inst.isSubInstallment ? null : new Date(inst.dueDate),
        totalReceived: 0,
        balance: inst.amount,
        interest,
        paid: false,
        isSubInstallment: inst.isSubInstallment || false,
        parentDueDate: inst.isSubInstallment ? new Date(inst.parentDueDate) : undefined,
        commitmentDate: inst.isSubInstallment ? new Date(inst.commitmentDate) : undefined,
      };
    }));

    // Validate total EMI amount against paymentType1
    const totalEMIAmount = validatedInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    if (totalEMIAmount > booking.paymentType1) {
      return res.status(400).json({
        message: `Total EMI amount (${totalEMIAmount}) cannot exceed Payment Type 1 amount (${booking.paymentType1}).`,
      });
    }

    // Sort installments: parents followed by sub-installments
    const sortedInstallments = validatedInstallments.sort((a, b) => {
      const aIsSub = a.isSubInstallment ? 1 : 0;
      const bIsSub = b.isSubInstallment ? 1 : 0;
      const aBaseNo = a.installmentNo.split("-")[0];
      const bBaseNo = b.installmentNo.split("-")[0];

      if (aBaseNo === bBaseNo) {
        return aIsSub - bIsSub;
      }
      return parseInt(aBaseNo) - parseInt(bBaseNo);
    });

    const emi = new EMI({
      bookingId,
      installments: sortedInstallments,
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
    res.status(500).json({ success: false, message: `Server error while creating EMI: ${error.message}` });
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

    const booking = await Booking.findById(emi.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found for this EMI." });
    }

    // Validate and calculate interest for installments
    const validatedInstallments = await Promise.all(installments.map(async (inst) => {
      if (!inst.installmentNo || !inst.amount) {
        throw new Error(`Invalid installment data: installmentNo and amount are required.`);
      }
      if (inst.isSubInstallment && (!inst.parentDueDate || !inst.commitmentDate)) {
        throw new Error(`Sub-installment ${inst.installmentNo} must have parentDueDate and commitmentDate.`);
      }
      if (inst.isSubInstallment && inst.dueDate) {
        throw new Error(`Sub-installment ${inst.installmentNo} cannot have a dueDate.`);
      }

      let interest;
      if (inst.isSubInstallment) {
        // For sub-installments, use the main installment's latest receivedDate
        const mainInstallmentNo = inst.installmentNo.split("-")[0];
        const mainReconciliation = await PaymentReconciliation.findOne(
          { emiId: emi._id, installmentNo: mainInstallmentNo, isSubInstallment: false },
          { receivedDate: 1 },
          { sort: { receivedDate: -1 } }
        );
        const interestStartDate = mainReconciliation ? mainReconciliation.receivedDate : inst.parentDueDate;
        interest = calculateInterest(inst.amount - (inst.totalReceived || 0), interestStartDate, inst.commitmentDate || new Date());
      } else {
        interest = calculateInterest(inst.amount - (inst.totalReceived || 0), inst.dueDate, new Date());
      }

      return {
        installmentNo: String(inst.installmentNo),
        amount: inst.amount,
        dueDate: inst.isSubInstallment ? null : inst.dueDate ? new Date(inst.dueDate) : null,
        totalReceived: inst.totalReceived || 0,
        balance: inst.amount - (inst.totalReceived || 0),
        interest,
        paid: inst.paid || false,
        isSubInstallment: inst.isSubInstallment || false,
        parentDueDate: inst.isSubInstallment ? new Date(inst.parentDueDate) : undefined,
        commitmentDate: inst.isSubInstallment ? new Date(inst.commitmentDate) : undefined,
      };
    }));

    // Validate total EMI amount
    const totalUpdatedAmount = validatedInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    if (totalUpdatedAmount > booking.paymentType1) {
      return res.status(400).json({
        message: `Total EMI amount (${totalUpdatedAmount}) exceeds allowed Payment Type 1 (${booking.paymentType1}).`,
      });
    }

    // Sort installments: parents followed by sub-installments
    const sortedInstallments = validatedInstallments.sort((a, b) => {
      const aIsSub = a.isSubInstallment ? 1 : 0;
      const bIsSub = b.isSubInstallment ? 1 : 0;
      const aBaseNo = a.installmentNo.split("-")[0];
      const bBaseNo = b.installmentNo.split("-")[0];

      if (aBaseNo === bBaseNo) {
        return aIsSub - bIsSub;
      }
      return parseInt(aBaseNo) - parseInt(bBaseNo);
    });

    emi.installments = sortedInstallments;
    emi.updatedBy = updatedBy;
    await emi.save();

    res.status(200).json({
      success: true,
      message: "EMI updated successfully.",
      emi,
    });
  } catch (error) {
    console.error("Error updating EMI:", error);
    res.status(500).json({ message: `Server error while updating EMI: ${error.message}` });
  }
};

exports.getEMIByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const emi = await EMI.findOne({ bookingId })
      .populate("bookingId")
      .lean();

    if (!emi) {
      return res.status(404).json({ message: "EMI not found for this booking." });
    }

    // Aggregate received amounts and latest received date for each installmentNo
    const receivedData = await PaymentReconciliation.aggregate([
      { $match: { emiId: emi._id } },
      { $group: { _id: "$installmentNo", totalReceived: { $sum: "$todayReceiving" }, latestReceivedDate: { $max: "$receivedDate" } } },
    ]);

    const receivedMap = {};
    const latestReceivedDateMap = {};
    receivedData.forEach((item) => {
      receivedMap[item._id] = item.totalReceived;
      latestReceivedDateMap[item._id] = item.latestReceivedDate;
    });

    // Calculate interest and balance for each installment
    const installmentsWithReceived = await Promise.all(emi.installments.map(async (inst) => {
      const totalReceived = receivedMap[inst.installmentNo] || 0;
      const balance = inst.amount - totalReceived;
      let interest;
      if (inst.isSubInstallment) {
        // For sub-installments, use the main installment's latest receivedDate
        const mainInstallmentNo = inst.installmentNo.split("-")[0];
        const mainReconciliation = receivedData.find((item) => item._id === mainInstallmentNo);
        const interestStartDate = mainReconciliation ? mainReconciliation.latestReceivedDate : inst.parentDueDate || inst.dueDate;
        interest = calculateInterest(balance, interestStartDate, inst.commitmentDate || latestReceivedDateMap[inst.installmentNo] || new Date());
      } else {
        interest = calculateInterest(balance, inst.dueDate, latestReceivedDateMap[inst.installmentNo] || new Date());
      }
      return {
        ...inst,
        totalReceived,
        balance,
        interest,
        commitmentDate: inst.isSubInstallment ? inst.commitmentDate || latestReceivedDateMap[inst.installmentNo] : inst.commitmentDate,
      };
    }));

    // Sort installments: parents followed by sub-installments
    const sortedInstallments = installmentsWithReceived.sort((a, b) => {
      const aIsSub = a.isSubInstallment ? 1 : 0;
      const bIsSub = b.isSubInstallment ? 1 : 0;
      const aBaseNo = a.installmentNo.split("-")[0];
      const bBaseNo = b.installmentNo.split("-")[0];

      if (aBaseNo === bBaseNo) {
        return aIsSub - bIsSub;
      }
      return parseInt(aBaseNo) - parseInt(bBaseNo);
    });

    res.json({
      success: true,
      emi: {
        ...emi,
        installments: sortedInstallments,
      },
    });
  } catch (error) {
    console.error("Error fetching EMI by booking:", error);
    res.status(500).json({ message: "Server error while fetching EMI." });
  }
};

module.exports = {
  createEMI: exports.createEMI,
  updateEMI: exports.updateEMI,
  getEMIByBookingId: exports.getEMIByBookingId,
};




