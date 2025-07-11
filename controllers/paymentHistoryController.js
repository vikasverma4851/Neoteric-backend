

const PaymentHistory = require("../models/PaymentHistory");
const Booking = require("../models/Booking");

exports.getPaymentHistory = async (req, res) => {
  try {
    const { startDate, endDate, searchTerm } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.receivingDate = {};
      if (startDate) query.receivingDate.$gte = new Date(startDate);
      if (endDate) query.receivingDate.$lte = new Date(endDate);
    }

    let bookingIds = [];

    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i");

      // Find Booking IDs matching searchTerm in taskId, clientName, clientMobile
      const matchingBookings = await Booking.find({
        $or: [
          { taskId: regex },
          { clientName: regex },
          { clientMobile: regex },
        ],
      }).select("_id");

      bookingIds = matchingBookings.map(b => b._id);

      // Apply search on PaymentHistory fields or matched booking IDs
      query.$or = [
        { clientId: regex },
        { mobileNo: regex },
        { utr: regex },
        { bankDetails: regex },
        { bookingId: { $in: bookingIds } },
      ];
    }

    const paymentHistory = await PaymentHistory.find(query)
      .populate("bookingId")
      .sort({ receivingDate: -1 });

    res.status(200).json({
      success: true,
      count: paymentHistory.length,
      data: paymentHistory,
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ message: "Server error fetching payment history." });
  }
};


// exports.getPaymentHistory = async (req, res) => {
//   try {
//     const { startDate, endDate, searchTerm } = req.query;
//     const query = {};

//     if (startDate || endDate) {
//       query.receivingDate = {};
//       if (startDate) query.receivingDate.$gte = new Date(startDate);
//       if (endDate) query.receivingDate.$lte = new Date(endDate);
//     }

//     if (searchTerm) {
//       const regex = new RegExp(searchTerm, "i");
//       query.$or = [
//         { clientId: regex },
//         { mobileNo: regex },
//         { utr: regex },
//         { bankDetails: regex },
//       ];
//     }

//     const paymentHistory = await PaymentHistory.find(query).populate("bookingId") .sort({ receivingDate: -1 });

//     res.status(200).json({
//       success: true,
//       count: paymentHistory.length,
//       data: paymentHistory,
//     });
//   } catch (error) {
//     console.error("Error fetching payment history:", error);
//     res.status(500).json({ message: "Server error fetching payment history." });
//   }
// };
