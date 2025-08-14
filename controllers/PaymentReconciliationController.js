const mongoose = require("mongoose");
const PaymentReconciliation = require("../models/PaymentReconciliation");
const Booking = require("../models/Booking");
const EMI = require("../models/EMI");
const PaymentHistory = require("../models/PaymentHistory");

const calculateInterest = (amount, fromDate, toDate) => {
  if (!fromDate || !toDate) return 0;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(0, 0, 0, 0);
  const diffTime = to - from;
  const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  const dailyRate = parseFloat((0.02 / 30).toFixed(10));
  const interest = Number(Math.round(amount * dailyRate * daysLate));
  console.log({ amount, fromDate, toDate, daysLate, dailyRate, interest });
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
      const { installmentNo, todayReceiving, interestReceived, utr, bankDetail, receivedDate, isSubInstallment, parentDueDate, commitmentDate } = paymentReconciliation;

      if (!installmentNo || todayReceiving === undefined || interestReceived === undefined || !receivedDate) {
        return res.status(400).json({ message: `Incomplete data for installment ${installmentNo}.` });
      }

      if (todayReceiving < 0 || interestReceived < 0) {
        return res.status(400).json({ message: `Amount or interest cannot be negative for ${installmentNo}.` });
      }

      if (isSubInstallment && !commitmentDate) {
        return res.status(400).json({ message: `Commitment date is mandatory for sub-installment ${installmentNo}.` });
      }


 

      const installmentIndex = updatedInstallments.findIndex((inst) => inst.installmentNo === installmentNo);
      if (installmentIndex === -1) {
        return res.status(404).json({ message: `Installment ${installmentNo} not found.` });
      }

      const installment = updatedInstallments[installmentIndex];


           // ✅ New validation: Sub-installment must be fully paid
if (isSubInstallment) {
  const subInstallmentAmount = installment.amount;
  if (todayReceiving > 0 &&   todayReceiving !== subInstallmentAmount) {
    return res.status(400).json({
      success:false,
      message: `Sub-installment ${installmentNo} must be paid in full. Expected: ${subInstallmentAmount}, Received: ${todayReceiving}`,
    });
  }
}


      const previousReconciliations = await PaymentReconciliation.aggregate([
        { $match: { emiId: emi._id, installmentNo } },
        { 
          $group: { 
            _id: null, 
            totalReceived: { $sum: "$todayReceiving" },
            totalInterestReceived: { $sum: "$interestReceived" },
            latestReceivedDate: { $max: "$receivedDate" },
            latestInterest: { $last: "$interest" }
          } 
        },
      ]);

      const previouslyReceived = previousReconciliations[0]?.totalReceived || 0;
      const previouslyInterestReceived = previousReconciliations[0]?.totalInterestReceived || 0;
      const previousInterest = previousReconciliations[0]?.latestInterest || installment.interest || 0;
      const newTotalReceived = previouslyReceived + todayReceiving;
      const newTotalInterestReceived = previouslyInterestReceived + interestReceived;

      if (newTotalReceived > installment.amount) {
        return res.status(400).json({
          message: `Reconciliation exceeds amount for ${installmentNo}. Allowed: ${installment.amount}, Attempted: ${newTotalReceived}`,
        });
      }

      let interest = previousInterest;
      const isAfterDueDate = !isSubInstallment && installment.dueDate && new Date(receivedDate) > new Date(installment.dueDate);
      if ((isAfterDueDate || isSubInstallment) && (todayReceiving > 0 || interestReceived > 0)) {
        const amountForInterest = installment.amount; // Always use original amount
        const interestStartDate = isSubInstallment 
          ? (parentDueDate || previousReconciliations[0]?.latestReceivedDate || installment.dueDate)
          : installment.dueDate;
        interest = calculateInterest(amountForInterest, interestStartDate, receivedDate);
      }

      if (newTotalInterestReceived > interest) {
        return res.status(400).json({
          
          message: `Interest received exceeds calculated interest for ${installmentNo}. Allowed: ${interest}, Attempted: ${newTotalInterestReceived}`,
        });
      }

      updatedInstallments[installmentIndex] = {
        ...installment,
        totalReceived: newTotalReceived,
        totalInterestReceived: newTotalInterestReceived,
        balance: installment.amount - newTotalReceived,
        interest,
        paid: newTotalReceived >= installment.amount && newTotalInterestReceived >= interest,
        ...(isSubInstallment && commitmentDate && { commitmentDate: new Date(commitmentDate) }),
      };

      if (!isSubInstallment && todayReceiving < installment.amount && todayReceiving > 0) {
        const remainingBalance = installment.amount - newTotalReceived;
        const subInstallmentNo = `${installmentNo}-sub`;



         // ✅ Update the parent installment amount to the received amount so far
  updatedInstallments[installmentIndex] = {
    ...updatedInstallments[installmentIndex],
    amount: newTotalReceived, // Set to actual received amount
    balance: 0, // Because this parent is now considered fully covered
    paid: true, // Mark parent as paid
  };


        if (!updatedInstallments.some((inst) => inst.installmentNo === subInstallmentNo)) {
          const subInstallment = {
            installmentNo: subInstallmentNo,
            amount: remainingBalance,
            dueDate: null,
            totalReceived: 0,
            totalInterestReceived: 0,
            balance: remainingBalance,
            interest: 0,
            paid: false,
            isSubInstallment: true,
            parentDueDate: receivedDate || installment.dueDate,
            commitmentDate: commitmentDate ? new Date(commitmentDate) : undefined,
          };
          updatedInstallments.splice(installmentIndex + 1, 0, subInstallment);
        }
      }

      paymentReconciliationRecords.push({
        bookingId,
        emiId: emi._id,
        installmentNo,
        todayReceiving,
        interestReceived,
        utr,
        bankDetail,
        receivedDate,
        interest,
        isSubInstallment: isSubInstallment || false,
        parentDueDate: isSubInstallment ? parentDueDate || installment.dueDate : undefined,
        createdBy,
      });

      paymentHistoryRecords.push({
        bookingId,
        emiId: emi._id,
        installmentNo,
        clientId: booking.clientName || "N/A",
        mobileNo: booking.clientMobile || "N/A",
        emis: installmentNo,
        installmentAmt: installment.amount,
        interest,
        interestReceived,
        amtReceived: todayReceiving,
        utr: utr || "",
        bankDetails: bankDetail || "",
        receivingDate: receivedDate,
        createdBy,
      });
    }

    await PaymentReconciliation.insertMany(paymentReconciliationRecords);
    await PaymentHistory.insertMany(paymentHistoryRecords);
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
    res.status(500).json({ message: "Server error during payment reconciliation.", error: error.message });
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

    const receivedData = await PaymentReconciliation.aggregate([
      { $match: { emiId: emi._id } },
      { 
        $group: { 
          _id: "$installmentNo", 
          totalReceived: { $sum: "$todayReceiving" },
          totalInterestReceived: { $sum: "$interestReceived" },
          latestReceivedDate: { $max: "$receivedDate" },
          latestInterest: { $last: "$interest" }
        } 
      },
    ]);

    const receivedMap = {};
    const interestReceivedMap = {};
    const latestReceivedDateMap = {};
    const interestMap = {};
    receivedData.forEach((item) => {
      receivedMap[item._id] = item.totalReceived;
      interestReceivedMap[item._id] = item.totalInterestReceived;
      latestReceivedDateMap[item._id] = item.latestReceivedDate;
      interestMap[item._id] = item.latestInterest;
    });

    const sortedInstallments = emi.installments
      .map((inst) => {
        const totalReceived = receivedMap[inst.installmentNo] || 0;
        const totalInterestReceived = interestReceivedMap[inst.installmentNo] || 0;
        const balance = inst.amount - totalReceived;
        let interest = interestMap[inst.installmentNo] || inst.interest || 0;
        const isAfterDueDate = !inst.isSubInstallment && inst.dueDate && latestReceivedDateMap[inst.installmentNo] && new Date(latestReceivedDateMap[inst.installmentNo]) > new Date(inst.dueDate);
        if (isAfterDueDate || inst.isSubInstallment) {
          const amountForInterest = inst.amount; // Always use original amount
          const interestStartDate = inst.isSubInstallment 
            ? (inst.parentDueDate || latestReceivedDateMap[inst.installmentNo.split("-")[0]] || inst.dueDate)
            : inst.dueDate;
          if (latestReceivedDateMap[inst.installmentNo]) {
            interest = calculateInterest(amountForInterest, interestStartDate, latestReceivedDateMap[inst.installmentNo]);
          }
        }
        return {
          ...inst,
          totalReceived,
          totalInterestReceived,
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
    res.status(500).json({ message: "Server error fetching EMI.", error: error.message });
  }
};

exports.getReconciliationsByEmiId = async (req, res) => {
  try {
    const { emiId } = req.params;
    const reconciliations = await PaymentReconciliation.find({ emiId })
      .select("installmentNo todayReceiving interestReceived utr bankDetail receivedDate interest isSubInstallment parentDueDate")
      .sort({ receivedDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      reconciliations,
    });
  } catch (error) {
    console.error("Error fetching reconciliations:", error);
    res.status(500).json({ message: "Server error fetching reconciliations.", error: error.message });
  }
};









// // Backend: Updated Node.js/Express code
// const mongoose = require("mongoose");
// const PaymentReconciliation = require("../models/PaymentReconciliation");
// const Booking = require("../models/Booking");
// const EMI = require("../models/EMI");
// const PaymentHistory = require("../models/PaymentHistory");

// // Calculate 2% per month as 0.02/30 per day accurately
// // const calculateInterest = (amount, fromDate, toDate) => {
// //   const from = new Date(fromDate);
// //   const to = new Date(toDate || new Date());

// //   const diffTime = to - from;
// //   const daysLate = Math.max(0, diffTime / (1000 * 60 * 60 * 24));

// //   const dailyRate = 0.02 / 30; // ~0.0006667 per day
// //   const interest = Number((amount * dailyRate * daysLate).toFixed(2));

// //   console.log({
// //     amount,
// //     fromDate,
// //     toDate,
// //     daysLate,
// //     dailyRate,
// //     interest
// //   });

// //   return interest;
// // };


// // const calculateInterest = (amount, fromDate, toDate) => {
// //   const from = new Date(fromDate);
// //   const to = new Date(toDate || new Date());

// //   // Normalize to UTC 00:00 to avoid partial day differences
// //   from.setUTCHours(0, 0, 0, 0);
// //   to.setUTCHours(0, 0, 0, 0);

// //   const diffTime = to - from;
// //   const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

// //   const dailyRate = 0.02 / 30; // ~0.000666666...
// //   const interest = Number((amount * dailyRate * daysLate).toFixed(2));

// //   console.log({
// //     amount,
// //     fromDate,
// //     toDate,
// //     daysLate,
// //     dailyRate,
// //     interest
// //   });

// //   return interest;
// // };


// const calculateInterest = (amount, fromDate, toDate) => {
//   const from = new Date(fromDate);
//   const to = new Date(toDate || new Date());
//   from.setUTCHours(0, 0, 0, 0);
//   to.setUTCHours(0, 0, 0, 0);

//   const diffTime = to - from;
//   const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
//   // const dailyRate = 0.02 / 30;


// const dailyRate = parseFloat((0.02 / 30).toFixed(10)); // 0.0006666667



//   const interest = Number((amount * dailyRate * daysLate).toFixed(2));
//   console.log({ amount, fromDate, toDate, daysLate, dailyRate, interest });

//   return interest;
// };



// exports.createPaymentReconciliation = async (req, res) => {
//   try {
//     const { bookingId, paymentReconciliations } = req.body;
//     const createdBy = req?.user?._id;

//     if (!bookingId || !paymentReconciliations || !Array.isArray(paymentReconciliations) || paymentReconciliations.length === 0) {
//       return res.status(400).json({ message: "Invalid reconciliation data." });
//     }

//     const booking = await mongoose.model("Booking").findById(bookingId);
//     if (!booking) {
//       return res.status(404).json({ message: "Booking not found." });
//     }

//     const emi = await EMI.findOne({ bookingId });
//     if (!emi) {
//       return res.status(404).json({ message: "EMI not found for this booking." });
//     }

//     const paymentReconciliationRecords = [];
//     const paymentHistoryRecords = [];
//     let updatedInstallments = [...emi.installments];

//     for (const paymentReconciliation of paymentReconciliations) {
//       const { installmentNo, todayReceiving, interestReceived, utr, bankDetail, receivedDate, isSubInstallment, parentDueDate, commitmentDate } = paymentReconciliation;

//       // if (!installmentNo || todayReceiving === undefined || interestReceived === undefined || !receivedDate) {
//       //   return res.status(400).json({ message: `Incomplete payment reconciliation data for installment ${installmentNo}. Received date is required.` });
//       // }

//       // if (todayReceiving < 0 || interestReceived < 0) {
//       //   return res.status(400).json({ message: `Amount or interest receiving cannot be negative for installment ${installmentNo}.` });
//       // }

//       // if (todayReceiving === 0 && interestReceived === 0) {
//       //   return res.status(400).json({ message: `No payment or interest received for installment ${installmentNo}.` });
//       // }

//       // Find the installment
//       const installmentIndex = updatedInstallments.findIndex((inst) => inst.installmentNo === installmentNo);
//       if (installmentIndex === -1) {
//         return res.status(404).json({ message: `Installment ${installmentNo} not found.` });
//       }

//       const installment = updatedInstallments[installmentIndex];

//       // Calculate total already received (principal and interest)
//       const previousReconciliations = await PaymentReconciliation.aggregate([
//         { $match: { emiId: emi._id, installmentNo } },
//         { 
//           $group: { 
//             _id: null, 
//             totalReceived: { $sum: "$todayReceiving" },
//             totalInterestReceived: { $sum: "$interestReceived" },
//             latestReceivedDate: { $max: "$receivedDate" }
//           } 
//         },
//       ]);
//       const previouslyReceived = previousReconciliations[0]?.totalReceived || 0;
//       const previouslyInterestReceived = previousReconciliations[0]?.totalInterestReceived || 0;
//       const latestReceivedDate = previousReconciliations[0]?.latestReceivedDate;
//       const newTotalReceived = previouslyReceived + todayReceiving;
//       const newTotalInterestReceived = previouslyInterestReceived + interestReceived;

//       console.log("amount check-",newTotalReceived);
      

//       // Validate principal payment
//       // if (newTotalReceived > installment.amount) {
//       //   return res.status(400).json({
//       //     message: `Reconciliation exceeds installment amount for ${installmentNo}. Allowed: ${installment.amount}, Attempted Total: ${newTotalReceived}`,
//       //   });
//       // }

//       // Calculate interest using original amount if fully paid, else use balance
//       let interest;
//       const amountForInterest = newTotalReceived >= installment.amount ? installment.amount : installment.balance;
//       if (isSubInstallment) {
//         const mainInstallmentNo = installmentNo.split("-")[0];
//         const mainReconciliation = await PaymentReconciliation.findOne(
//           { emiId: emi._id, installmentNo: mainInstallmentNo, isSubInstallment: false },
//           { receivedDate: 1 },
//           { sort: { receivedDate: -1 } }
//         );
//         const interestStartDate = mainReconciliation ? mainReconciliation.receivedDate : parentDueDate || installment.dueDate;
//         interest = calculateInterest(amountForInterest, interestStartDate, receivedDate);

//       } else {
//         const interestStartDate = latestReceivedDate || installment.dueDate;
//         interest = calculateInterest(amountForInterest, interestStartDate, receivedDate);
//       }

// console.log('newTotalInterestReceived',newTotalInterestReceived);
// console.log('interest',interest);


//       // Validate interest received
//       // if (newTotalInterestReceived > interest) {
//       //   return res.status(400).json({
//       //     message: `Interest received exceeds calculated interest for ${installmentNo}. Allowed: ${interest}, Attempted Total: ${newTotalInterestReceived}, Balance: ${installment.balance}`,
//       //   });
//       // }

//       // Update installment

//       console.log('newTotalInterestrec-',newTotalInterestReceived);
      

//       updatedInstallments[installmentIndex] = {
//         ...installment,
//         totalReceived: newTotalReceived,
//         totalInterestReceived: newTotalInterestReceived,
//         balance: installment.amount - newTotalReceived,
//         interest,
//         paid: newTotalReceived >= installment.amount && newTotalInterestReceived >= interest,
//         ...(isSubInstallment && commitmentDate && { commitmentDate: new Date(commitmentDate) }),
//       };

//       // Create sub-installment for partial principal payment
//       if (!isSubInstallment && todayReceiving < installment.amount && todayReceiving > 0) {
//         const remainingBalance = installment.amount - newTotalReceived;
//         const subInstallmentNo = `${installmentNo}-sub`;

//         if (!updatedInstallments.some((inst) => inst.installmentNo === subInstallmentNo)) {
//           const subInstallmentInterest = calculateInterest(remainingBalance, receivedDate, receivedDate);
//           const subInstallment = {
//             installmentNo: subInstallmentNo,
//             amount: remainingBalance,
//             dueDate: null,
//             totalReceived: 0,
//             totalInterestReceived: 0,
//             balance: remainingBalance,
//             interest: subInstallmentInterest,
//             paid: false,
//             isSubInstallment: true,
//             parentDueDate: installment.dueDate,
//             commitmentDate: commitmentDate ? new Date(commitmentDate) : undefined,
//           };
//           updatedInstallments.splice(installmentIndex + 1, 0, subInstallment);
//         }
//       }

//       // Record payment reconciliation
//       paymentReconciliationRecords.push({
//         bookingId,
//         emiId: emi._id,
//         installmentNo,
//         todayReceiving,
//         interestReceived,
//         utr,
//         bankDetail,
//         receivedDate,
//         interest,
//         isSubInstallment: isSubInstallment || false,
//         parentDueDate: isSubInstallment ? parentDueDate || installment.dueDate : undefined,
//         createdBy,
//       });

//       // Create PaymentHistory record
//       paymentHistoryRecords.push({
//         bookingId,
//         emiId: emi._id,
//         installmentNo,
//         clientId: booking.clientName || "N/A",
//         mobileNo: booking.clientMobile || "N/A",
//         emis: installmentNo,
//         installmentAmt: installment.amount,
//         interest,
//         interestReceived,
//         amtReceived: todayReceiving,
//         utr: utr || "",
//         bankDetails: bankDetail || "",
//         receivingDate: receivedDate,
//         createdBy,
//       });
//     }

//     // Insert payment reconciliation records
//     await PaymentReconciliation.insertMany(paymentReconciliationRecords);

//     // Insert payment history records
//     try {
//       await mongoose.model("PaymentHistory").insertMany(paymentHistoryRecords);
//     } catch (e) {
//       console.error("Error inserting PaymentHistory:", e);
//       return res.status(500).json({ message: "Error inserting PaymentHistory.", error: e.message });
//     }

//     // Update EMI with new installments array
//     emi.installments = updatedInstallments;
//     await emi.save();

//     res.status(201).json({
//       success: true,
//       message: "Payment reconciliation recorded successfully.",
//       paymentReconciliations: paymentReconciliationRecords,
//       emi,
//     });
//   } catch (error) {
//     console.error("Error during payment reconciliation:", error);
//     res.status(500).json({ message: "Server error during payment reconciliation." });
//   }
// };

// exports.getEMIByBooking = async (req, res) => {
//   try {
//     const { bookingId } = req.params;
//     const emi = await EMI.findOne({ bookingId })
//       .populate("bookingId")
//       .lean();

//     if (!emi) {
//       return res.status(404).json({ message: "EMI not found for this booking." });
//     }

//     // Aggregate received amounts and latest received date for each installmentNo
//     const receivedData = await PaymentReconciliation.aggregate([
//       { $match: { emiId: emi._id } },
//       { 
//         $group: { 
//           _id: "$installmentNo", 
//           totalReceived: { $sum: "$todayReceiving" },
//           totalInterestReceived: { $sum: "$interestReceived" },
//           latestReceivedDate: { $max: "$receivedDate" } 
//         } 
//       },
//     ]);

//     const receivedMap = {};
//     const interestReceivedMap = {};
//     const latestReceivedDateMap = {};
//     receivedData.forEach((item) => {
//       receivedMap[item._id] = item.totalReceived;
//       interestReceivedMap[item._id] = item.totalInterestReceived;
//       latestReceivedDateMap[item._id] = item.latestReceivedDate;
//     });

//     // Calculate interest and balance for each installment
//     const sortedInstallments = emi.installments
//       .map((inst) => {
//         const totalReceived = receivedMap[inst.installmentNo] || 0;
//         const totalInterestReceived = interestReceivedMap[inst.installmentNo] || 0;
//         const balance = inst.amount - totalReceived;
//         let interest;
//         const amountForInterest = totalReceived >= inst.amount ? inst.amount : balance;
//         if (inst.isSubInstallment) {
//           const mainInstallmentNo = inst.installmentNo.split("-")[0];
//           const mainReconciliation = receivedData.find((item) => item._id === mainInstallmentNo);
//           const interestStartDate = mainReconciliation ? mainReconciliation.latestReceivedDate : inst.parentDueDate || inst.dueDate;
//           interest = calculateInterest(amountForInterest, interestStartDate, inst.commitmentDate || latestReceivedDateMap[inst.installmentNo] || new Date());
//         } else {
//           const interestStartDate = latestReceivedDateMap[inst.installmentNo] || inst.dueDate;
//           interest = calculateInterest(amountForInterest, interestStartDate, inst.commitmentDate || latestReceivedDateMap[inst.installmentNo] || new Date());
//         }
//         return {
//           ...inst,
//           totalReceived,
//           totalInterestReceived,
//           balance,
//           interest,
//           commitmentDate: inst.isSubInstallment ? inst.commitmentDate || latestReceivedDateMap[inst.installmentNo] : inst.commitmentDate,
//         };
//       })
//       .sort((a, b) => {
//         const aIsSub = a.isSubInstallment ? 1 : 0;
//         const bIsSub = b.isSubInstallment ? 1 : 0;
//         const aBaseNo = a.installmentNo.split("-")[0];
//         const bBaseNo = b.installmentNo.split("-")[0];

//         if (aBaseNo === bBaseNo) {
//           return aIsSub - bIsSub;
//         }
//         return parseInt(aBaseNo) - parseInt(bBaseNo);
//       });

//     res.status(200).json({
//       success: true,
//       emi: { ...emi, installments: sortedInstallments },
//     });
//   } catch (error) {
//     console.error("Error fetching EMI:", error);
//     res.status(500).json({ message: "Server error fetching EMI." });
//   }
// };

// exports.getReconciliationsByEmiId = async (req, res) => {
//   try {
//     const { emiId } = req.params;
//     const reconciliations = await PaymentReconciliation.find({ emiId })
//       .select("installmentNo todayReceiving interestReceived utr bankDetail receivedDate interest isSubInstallment parentDueDate")
//       .sort({ receivedDate: -1 })
//       .lean();

//     res.status(200).json({
//       success: true,
//       reconciliations,
//     });
//   } catch (error) {
//     console.error("Error fetching reconciliations:", error);
//     res.status(500).json({ message: "Server error fetching reconciliations." });
//   }
// };



