const mongoose = require("mongoose");
const Project = require("../models/Project");
const Booking = require("../models/Booking");
const EMI = require("../models/EMI");
const PaymentReconciliation = require("../models/PaymentReconciliation");

exports.getProjectReport = async (req, res) => {
  try {
    const { startDate, endDate, searchTerm } = req.query;
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "Authorization token is required." });
    }

    // Define date filter for PaymentReconciliation
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    console.log("Date filter applied:", dateFilter); // *** Added to log date filter ***

    // Fetch all projects
    const projects = await Project.find().select("name").lean();
    console.log("Projects found:", projects);

    // Fetch bookings with associated EMIs
    const bookingsWithEmi = await Booking.aggregate([
      {
        $lookup: {
          from: "emis",
          localField: "_id",
          foreignField: "bookingId",
          as: "emi",
        },
      },
      {
        $match: {
          "emi.0": { $exists: true }, // Only include bookings with at least one EMI
        },
      },
      {
        $project: {
          projectName: { $toLower: { $trim: { input: "$projectName" } } }, // *** Trim and lowercase ***
          paymentType1: 1,
          _id: 1,
        },
      },
    ]);
    console.log("Bookings with EMIs:", bookingsWithEmi);

    // Fetch payment reconciliations within the date range
    const paymentReconciliations = await PaymentReconciliation.find(
      dateFilter.$gte || dateFilter.$lte ? { receivedDate: dateFilter } : {}
    )
      .select("bookingId todayReceiving receivedDate") // *** Added receivedDate for debugging ***
      .lean();
    console.log("Payment reconciliations:", paymentReconciliations);

    // Aggregate data by project
    const projectReport = projects
      .map((project) => {
        // Normalize project name for matching
        const normalizedProjectName = project.name.toLowerCase().trim(); // *** Trim spaces ***
        
        // Filter bookings for this project (case-insensitive)
        const projectBookings = bookingsWithEmi.filter(
          (b) => b.projectName === normalizedProjectName
        );

        // Skip projects with no bookings
        if (projectBookings.length === 0) {
          return null;
        }

        // Calculate total target (sum of paymentType1 for bookings with EMI)
        const totalTarget = projectBookings.reduce(
          (sum, b) => sum + (parseFloat(b.paymentType1) || 0),
          0
        );

        // Calculate total received from PaymentReconciliation
        const bookingIds = projectBookings.map((b) => b._id.toString());
        const totalReceived = paymentReconciliations
          .filter((pr) => bookingIds.includes(pr.bookingId.toString()))
          .reduce((sum, pr) => sum + (parseFloat(pr.todayReceiving) || 0), 0);

        // Calculate total balance
        const totalBalance = totalTarget - totalReceived;

        return {
          projectName: project.name, // Keep original case for display
          totalTarget,
          totalReceived,
          totalBalance,
        };
      })
      .filter((report) => report !== null);

    // Apply search term filter if provided (case-insensitive)
    let filteredReport = projectReport;
    if (searchTerm) {
      filteredReport = projectReport.filter((project) =>
        project.projectName.toLowerCase().includes(searchTerm.toLowerCase().trim()) // *** Trim searchTerm ***
      );
    }

    res.status(200).json({
      success: true,
      data: filteredReport,
    });
  } catch (error) {
    console.error("Error generating project report:", error);
    res.status(500).json({ message: "Server error while generating project report.", error: error.message });
  }
};


exports.getEmiReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authorization token is required." });
    }

    // Define date filter for PaymentReconciliation
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    console.log("Date filter applied:", dateFilter);

    // Aggregate payment reconciliations by bookingId
    const paymentData = await PaymentReconciliation.aggregate([
      {
        $match: dateFilter.$gte || dateFilter.$lte ? { receivedDate: dateFilter } : {},
      },
      {
        $group: {
          _id: "$bookingId",
          amtReceived: { $sum: { $toDouble: "$todayReceiving" } }, // Sum payments per booking
          payments: {
            $push: {
              utr: "$utr",
              bankDetails: "$bankDetails",
              receivingDate: "$receivedDate",
            },
          },
        },
      },
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "_id",
          as: "booking",
        },
      },
      {
        $unwind: "$booking",
      },
      {
        $lookup: {
          from: "emis",
          localField: "_id",
          foreignField: "bookingId",
          as: "emi",
        },
      },
      {
        $unwind: "$emi",
      },
      {
        $match: {
          "emi.installments": { $exists: true, $not: { $size: 0 } },
        },
      },
      {
        $project: {
          clientId: "$booking.taskId",
          mobileNo: "$booking.mobile",
          emis: { $size: "$emi.installments" },
          installmentAmt: { $sum: "$emi.installments.amount" },
          amtReceived: 1,
          utr: { $arrayElemAt: ["$payments.utr", 0] }, // Take first payment's UTR
          bankDetails: { $arrayElemAt: ["$payments.bankDetails", 0] }, // Take first payment's bankDetails
          receivingDate: { $arrayElemAt: ["$payments.receivingDate", 0] }, // Take first payment's date
          projectName: { $trim: { input: "$booking.projectName" } },
        },
      },
    ]);

    console.log("EMI report data:", paymentData);

    res.status(200).json({
      success: true,
      data: paymentData,
    });
  } catch (error) {
    console.error("Error generating EMI report:", error);
    res.status(500).json({ message: "Server error while generating EMI report.", error: error.message });
  }
};




exports.getInstallmentReport = async (req, res) => {
  try {
    const { startDate, endDate, searchTerm } = req.query;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authorization token is required." });
    }

    // Define date filter for EMI due dates
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    console.log("Date filter applied:", dateFilter);

    // Define search filter
    const searchFilter = searchTerm
      ? {
          $or: [
            { projectName: { $regex: searchTerm.trim(), $options: "i" } },
            { taskId: { $regex: searchTerm.trim(), $options: "i" } },
            { mobile: { $regex: searchTerm.trim(), $options: "i" } },
          ],
        }
      : {};
    console.log("Search filter applied:", searchFilter);

    // Aggregate data
    const installmentData = await Booking.aggregate([
      {
        $match: searchFilter, // Apply search filter at Booking level
      },
      {
        $lookup: {
          from: "emis",
          localField: "_id",
          foreignField: "bookingId",
          as: "emi",
        },
      },
      {
        $unwind: { path: "$emi", preserveNullAndEmptyArrays: true },
      },
      {
        $match: {
          "emi.installments": { $exists: true, $not: { $size: 0 } },
        },
      },
      {
        $unwind: {
          path: "$emi.installments",
          includeArrayIndex: "installmentIndex",
        },
      },
      {
        $match: {
          $and: [
            { "emi.installments.amount": { $gt: 0 } },
            Object.keys(dateFilter).length > 0
              ? { "emi.installments.dueDate": dateFilter }
              : {},
          ],
        },
      },
      {
        $project: {
          clientId: "$taskId",
          mobileNo: "$mobile",
          projectName: { $trim: { input: "$projectName" } },
          installmentNumber: "$emi.installments.installmentNo",
          installmentAmt: "$emi.installments.amount",
          amtReceived: "$emi.installments.totalReceived",
          balance: "$emi.installments.balance",
          dueDate: "$emi.installments.dueDate",
          interest: "$emi.installments.interest",
          interestReceived: "$emi.installments.totalInterestReceived",
          interestBalance: {
            $subtract: [
              { $ifNull: ["$emi.installments.interest", 0] },
              { $ifNull: ["$emi.installments.totalInterestReceived", 0] },
            ],
          },
          // status: {
          //   $cond: {
          //     if: { $eq: ["$emi.installments.balance", 0] }, // Use balance for status
          //     then: "Paid",
          //     else: "Pending",
          //   },
          // },

          status: {
  $cond: {
    if: {
      $and: [
        { $eq: ["$emi.installments.balance", 0] },
        { $eq: [{ $subtract: ["$emi.installments.interest", "$emi.installments.totalInterestReceived"] }, 0] }
      ]
    },
    then: "Paid",
    else: "Pending"
  }
},

          utr: "N/A",
          bankDetails: "N/A",
          receivingDate: null,
        },
      },
      {
        $sort: { projectName: 1, clientId: 1, dueDate: 1 },
      },
    ]);

    console.log("Installment report data:", installmentData);

    res.status(200).json({
      success: true,
      data: installmentData,
    });
  } catch (error) {
    console.error("Error generating installment report:", error);
    res.status(500).json({
      message: "Server error while generating installment report.",
      error: error.message,
    });
  }
};

// exports.getInstallmentReport = async (req, res) => {
//   try {
//     const { startDate, endDate, searchTerm } = req.query;
//     const token = req.headers.authorization?.split(" ")[1];

//     if (!token) {
//       return res.status(401).json({ message: "Authorization token is required." });
//     }

//     // Define date filter for EMI due dates
//     const dateFilter = {};
//     if (startDate) {
//       dateFilter.$gte = new Date(startDate);
//     }
//     if (endDate) {
//       dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
//     }
//     console.log("Date filter applied:", dateFilter);

//     // Define search filter
//     const searchFilter = searchTerm
//       ? {
//           $or: [
//             { projectName: { $regex: searchTerm.trim(), $options: "i" } },
//             { taskId: { $regex: searchTerm.trim(), $options: "i" } },
//             { mobile: { $regex: searchTerm.trim(), $options: "i" } },
//           ],
//         }
//       : {};
//     console.log("Search filter applied:", searchFilter);

//     // Aggregate data
//     const installmentData = await Booking.aggregate([
//       {
//         $match: searchFilter, // Apply search filter at Booking level
//       },
//       {
//         $lookup: {
//           from: "emis",
//           localField: "_id",
//           foreignField: "bookingId",
//           as: "emi",
//         },
//       },
//       {
//         $unwind: { path: "$emi", preserveNullAndEmptyArrays: true },
//       },
//       {
//         $match: {
//           "emi.installments": { $exists: true, $not: { $size: 0 } },
//         },
//       },
//       {
//         $unwind: {
//           path: "$emi.installments",
//           includeArrayIndex: "installmentIndex",
//         },
//       },
//       {
//         $lookup: {
//           from: "paymentreconciliations",
//           let: { bookingId: "$_id", dueDate: "$emi.installments.dueDate" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$bookingId", "$$bookingId"] },
//                     {
//                       $or: [
//                         {
//                           $and: [
//                             { $ne: ["$receivedDate", null] },
//                             {
//                               $lte: [
//                                 { $abs: { $subtract: ["$receivedDate", "$$dueDate"] } },
                             
//                                 7 * 24 * 60 * 60 * 1000, // 7 days in ms
//                               ],
//                             },
//                           ],
//                         },
//                         { $eq: ["$receivedDate", null] },
//                       ],
//                     },
//                   ],
//                 },
//               },
//             },
//             {
//               $group: {
//                 _id: null,
//                 amtReceived: { $sum: { $toDouble: "$todayReceiving" } },
//                 payments: {
//                   $push: {
//                     utr: { $ifNull: ["$utr", "N/A"] },
//                     bankDetails: { $ifNull: ["$bankDetails", "N/A"] },
//                     receivedDate: "$receivedDate",
//                   },
//                 },
//               },
//             },
//           ],
//           as: "payments",
//         },
//       },
//       {
//         $unwind: { path: "$payments", preserveNullAndEmptyArrays: true },
//       },
//       {
//         $project: {
//           clientId: "$taskId",
//           mobileNo: "$mobile",
//           projectName: { $trim: { input: "$projectName" } },
//           installmentNumber: { $add: ["$installmentIndex", 1] },
//           installmentAmt: "$emi.installments.amount",
//           amtReceived: { $ifNull: ["$payments.amtReceived", 0] },
//           dueDate: "$emi.installments.dueDate",
//           utr: { $ifNull: [{ $arrayElemAt: ["$payments.payments.utr", 0] }, "N/A"] },
//           bankDetails: { $ifNull: [{ $arrayElemAt: ["$payments.payments.bankDetails", 0] }, "N/A"] },
//           receivingDate: { $ifNull: [{ $arrayElemAt: ["$payments.payments.receivedDate", 0] }, null] },
//           interestAmount: {
//             $cond: {
//               if: {
//                 $and: [
//                   { $gt: ["$emi.installments.amount", 0] },
//                   {
//                     $gt: [
//                       { $subtract: ["$emi.installments.amount", { $ifNull: ["$payments.amtReceived", 0] }] },
//                       0,
//                     ],
//                   },
//                   { $lt: ["$emi.installments.dueDate", new Date("2025-08-05")] },
//                 ],
//               },
//               then: {
//                 $multiply: [
//                   { $subtract: ["$emi.installments.amount", { $ifNull: ["$payments.amtReceived", 0] }] },
//                   { $ifNull: ["$emi.installments.interestRate", 0.12] },
//                   {
//                     $divide: [
//                       { $subtract: [new Date("2025-08-05"), "$emi.installments.dueDate"] },
//                       1000 * 60 * 60 * 24 * 365,
//                     ],
//                   },
//                 ],
//               },
//               else: 0,
//             },
//           },
//         },
//       },
//       {
//         $match: {
//           $and: [
//             { installmentAmt: { $gt: 0 } },
//             dateFilter.$gte || dateFilter.$lte ? { dueDate: dateFilter } : {},
//           ],
//         },
//       },
//       {
//         $sort: { projectName: 1, clientId: 1, dueDate: 1 },
//       },
//     ]);

//     console.log("Installment report data:", installmentData);

//     res.status(200).json({
//       success: true,
//       data: installmentData.map((item) => ({
//         ...item,
//         status: item.amtReceived >= item.installmentAmt ? "Paid" : "Pending",
//       })),
//     });
//   } catch (error) {
//     console.error("Error generating installment report:", error);
//     res.status(500).json({ message: "Server error while generating installment report.", error: error.message });
//   }
// };