const mongoose = require("mongoose");
const PaymentReconciliation = require("../models/PaymentReconciliation");
const Booking = require("../models/Booking");
const EMI = require("../models/EMI");
const PaymentHistory = require("../models/PaymentHistory");

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

exports.createPaymentReconciliation = async (req, res) => {
  try {
    const { bookingId, paymentReconciliations } = req.body;
    const createdBy = req?.user?._id;

    if (!bookingId || !paymentReconciliations || !Array.isArray(paymentReconciliations) || paymentReconciliations.length === 0) {
      return res.status(400).json({ message: "Invalid reconciliation data." });
    }

    const booking = await mongoose.model("Booking").findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const emi = await EMI.findOne({ bookingId });
    if (!emi) {
      return res.status(404).json({ message: "EMI not found for this booking." });
    }

    const paymentReconciliationRecords = [];
    const paymentHistoryRecords = [];
    let updatedInstallments = [...emi.installments];

    for (const paymentReconciliation of paymentReconciliations) {
      const { installmentNo, todayReceiving, utr, bankDetail, receivedDate, isSubInstallment, parentDueDate , commitmentDate  } = paymentReconciliation;

      if (!installmentNo || todayReceiving === undefined || !receivedDate) {
        return res.status(400).json({ message: `Incomplete payment reconciliation data for installment ${installmentNo}.` });
      }

      if (todayReceiving < 0) {
        return res.status(400).json({ message: `Amount receiving cannot be negative for installment ${installmentNo}.` });
      }

      // Find the installment
      const installmentIndex = updatedInstallments.findIndex((inst) => inst.installmentNo === installmentNo);
      if (installmentIndex === -1) {
        return res.status(404).json({ message: `Installment ${installmentNo} not found.` });
      }

      const installment = updatedInstallments[installmentIndex];

      // Calculate total already received
      const previousReconciliations = await PaymentReconciliation.aggregate([
        { $match: { emiId: emi._id, installmentNo } },
        { $group: { _id: null, totalReceived: { $sum: "$todayReceiving" } } },
      ]);
      const previouslyReceived = previousReconciliations[0]?.totalReceived || 0;
      const newTotalReceived = previouslyReceived + todayReceiving;

      // Validate payment
      if (newTotalReceived > installment.amount) {
        return res.status(400).json({
          message: `Reconciliation exceeds installment amount for ${installmentNo}. Allowed: ${installment.amount}, Attempted Total: ${newTotalReceived}`,
        });
      }

      // Calculate interest
      let interest;
      if (isSubInstallment) {
        // For sub-installments, use the main installment's latest receivedDate
        const mainInstallmentNo = installmentNo.split("-")[0];
        const mainReconciliation = await PaymentReconciliation.findOne(
          { emiId: emi._id, installmentNo: mainInstallmentNo, isSubInstallment: false },
          { receivedDate: 1 },
          { sort: { receivedDate: -1 } }
        );
        const interestStartDate = mainReconciliation ? mainReconciliation.receivedDate : parentDueDate || installment.dueDate;
        interest = calculateInterest(installment.balance, interestStartDate, receivedDate);
      } else {
        interest = calculateInterest(installment.balance, installment.dueDate, receivedDate);
      }

      // Update installment
      updatedInstallments[installmentIndex] = {
        ...installment,
        totalReceived: newTotalReceived,
        balance: installment.amount - newTotalReceived,
        interest,
        paid: newTotalReceived >= installment.amount,
        // Update commitmentDate for sub-installments based on receivedDate
        // ...(isSubInstallment && { commitmentDate: new Date(receivedDate) }),
      };

       // ✅ Update commitmentDate for sub EMI if provided
      if (isSubInstallment && commitmentDate) {
        updatedInstallments[installmentIndex].commitmentDate = new Date(commitmentDate);
      }


      // Create sub-installment for partial payment (if not already a sub-installment)
      if (!isSubInstallment && todayReceiving < installment.amount && todayReceiving > 0) {
        const remainingBalance = installment.amount - newTotalReceived;
        const subInstallmentNo = `${installmentNo}-sub`;

        // Check if sub-installment already exists
        if (!updatedInstallments.some((inst) => inst.installmentNo === subInstallmentNo)) {
          // Use the current receivedDate as the start date for sub-installment interest
          const subInstallmentInterest = calculateInterest(remainingBalance, receivedDate, receivedDate);
          const subInstallment = {
            installmentNo: subInstallmentNo,
            amount: remainingBalance,
            dueDate: null,
            totalReceived: 0,
            balance: remainingBalance,
            interest: subInstallmentInterest,
            paid: false,
            isSubInstallment: true,
            parentDueDate: installment.dueDate,
            commitmentDate: commitmentDate ,
          };
          updatedInstallments.splice(installmentIndex + 1, 0, subInstallment);
        }
      }

      // Record payment reconciliation
      paymentReconciliationRecords.push({
        bookingId,
        emiId: emi._id,
        installmentNo,
        todayReceiving,
        utr,
        bankDetail,
        receivedDate,
        interest,
        isSubInstallment: isSubInstallment || false,
        parentDueDate: isSubInstallment ? parentDueDate || installment.dueDate : undefined,
        createdBy,
      });

      // Create PaymentHistory record
      paymentHistoryRecords.push({
        bookingId,
        emiId: emi._id,
        installmentNo,
        clientId: booking.clientName || "N/A",
        mobileNo: booking.clientMobile || "N/A",
        emis: installmentNo,
        installmentAmt: installment.amount,
        interest,
        amtReceived: todayReceiving,
        utr: utr || "",
        bankDetails: bankDetail || "",
        receivingDate: receivedDate,
        createdBy,
      });
    }

    // Insert payment reconciliation records
    await PaymentReconciliation.insertMany(paymentReconciliationRecords);

    // Insert payment history records
    try {
      await mongoose.model("PaymentHistory").insertMany(paymentHistoryRecords);
    } catch (e) {
      console.error("Error inserting PaymentHistory:", e);
      return res.status(500).json({ message: "Error inserting PaymentHistory.", error: e.message });
    }

    // Update EMI with new installments array
    emi.installments = updatedInstallments;
    await emi.save();

    res.status(201).json({
      success: true,
      message: "Payment reconciliation recorded successfully.",
      paymentReconciliations: paymentReconciliationRecords,
      emi,
    });
  } catch (error) {
    console.error("Error during payment reconciliation:", error);
    res.status(500).json({ message: "Server error during payment reconciliation." });
  }
};

exports.getEMIByBooking = async (req, res) => {
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
    const sortedInstallments = emi.installments
      .map((inst) => {
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
      })
      .sort((a, b) => {
        const aIsSub = a.isSubInstallment ? 1 : 0;
        const bIsSub = b.isSubInstallment ? 1 : 0;
        const aBaseNo = a.installmentNo.split("-")[0];
        const bBaseNo = b.installmentNo.split("-")[0];

        if (aBaseNo === bBaseNo) {
          return aIsSub - bIsSub;
        }
        return parseInt(aBaseNo) - parseInt(bBaseNo);
      });

    res.status(200).json({
      success: true,
      emi: { ...emi, installments: sortedInstallments },
    });
  } catch (error) {
    console.error("Error fetching EMI:", error);
    res.status(500).json({ message: "Server error fetching EMI." });
  }
};

exports.getReconciliationsByEmiId = async (req, res) => {
  try {
    const { emiId } = req.params;
    const reconciliations = await PaymentReconciliation.find({ emiId })
      .select("installmentNo todayReceiving utr bankDetail receivedDate interest isSubInstallment parentDueDate")
      .sort({ receivedDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      reconciliations,
    });
  } catch (error) {
    console.error("Error fetching reconciliations:", error);
    res.status(500).json({ message: "Server error fetching reconciliations." });
  }
};



