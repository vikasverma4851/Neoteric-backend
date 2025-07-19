// controllers/paymentController.js

const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const EMI = require("../models/EMI");

exports.receivePayment = async (req, res) => {
  try {
    const {
      bookingId, // <-- changed from taskId
      paymentType,
      todayReceiving,
      paymentBy,
      chequeTransactionNo
    } = req.body;

    const createdBy = req.user._id;


    if (!bookingId|| !paymentType || !todayReceiving || !paymentBy) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // const booking = await Booking.findOne({ taskId });
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const paymentTypeAmount = paymentType === "Payment Type 1"
      ? booking.paymentType1
      : booking.paymentType2;

    const previousPayments = await Payment.find({ bookingId, paymentType });
    const totalPreviouslyReceived = previousPayments.reduce((sum, payment) => sum + payment.todayReceiving, 0);

    const newTotalReceived = totalPreviouslyReceived + Number(todayReceiving);
    const newBalanceAmount = paymentTypeAmount - newTotalReceived;

    const payment = new Payment({
    bookingId,
      paymentType,
      todayReceiving: Number(todayReceiving),
      totalReceived: newTotalReceived,
      balanceAmount: newBalanceAmount >= 0 ? newBalanceAmount : 0,
      paymentBy,
      chequeTransactionNo,
      createdBy,
    });

    await payment.save();

    res.status(201).json({
      message: "Payment recorded successfully.",
      payment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error receiving payment.",
      error: error.message,
    });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    // const payments = await Payment.find().sort({ timestamp: -1 });
    const payments = await Payment.find().sort({ timestamp: -1 }).populate("bookingId");

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payments.", error: error.message });
  }
};

exports.getPaymentsByTaskId = async (req, res) => {
  try {
    const {bookingId} = req.params;
    // const payments = await Payment.find({ taskId }).sort({ timestamp: -1 });

    const payments = await Payment.find({bookingId }).sort({ timestamp: -1 }).populate("bookingId");
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payments.", error: error.message });
  }
};



exports.getFullyReceivedPaymentType2 = async (req, res) => {
  try {
    // Step 1: Get bookingIds that already have EMIs
    const bookingIdsWithEMIs = await EMI.distinct("bookingId");

    // Step 2: Get bookings without EMIs
    const bookings = await Booking.find({
      _id: { $nin: bookingIdsWithEMIs }
    });

    const fullyReceivedBookings = [];

    // Step 3: Check paymentType2 fully received or zero
    for (const booking of bookings) {
      if (booking.paymentType2 === 0) {
        // paymentType2 is zero, include directly
        fullyReceivedBookings.push(booking);
      } else {
        // Calculate total received paymentType2 payments
        const payments = await Payment.aggregate([
          { 
            $match: { 
              bookingId: booking._id, 
              paymentType: "Payment Type 2" 
            } 
          },
          {
            $group: {
              _id: null,
              totalReceived: { $sum: "$todayReceiving" },
            },
          },
        ]);

        const totalReceived = payments[0]?.totalReceived || 0;

        if (totalReceived >= booking.paymentType2) {
          fullyReceivedBookings.push(booking);
        }
      }
    }

    res.status(200).json({
      success: true,
      count: fullyReceivedBookings.length,
      data: fullyReceivedBookings,
    });
  } catch (error) {
    console.error("Error in getFullyReceivedPaymentType2:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching fully received Payment Type 2 bookings",
    });
  }
};


exports.getFullyReceivedPaymentType2WithEMICreated = async (req, res) => {
  try {
    // Step 1: Get bookingIds that already have EMIs
    const bookingIdsWithEMIs = await EMI.distinct("bookingId");

    // Step 2: Get bookings WITH EMIs only
    const bookings = await Booking.find({
      _id: { $in: bookingIdsWithEMIs }
    });

    const fullyReceivedBookings = [];

    // Step 3: Check paymentType2 fully received or zero
    for (const booking of bookings) {
      if (booking.paymentType2 === 0) {
        // paymentType2 is zero, include directly
        fullyReceivedBookings.push(booking);
      } else {
        // Calculate total received paymentType2 payments
        const payments = await Payment.aggregate([
          { 
            $match: { 
              bookingId: booking._id, 
              paymentType: "Payment Type 2" 
            } 
          },
          {
            $group: {
              _id: null,
              totalReceived: { $sum: "$todayReceiving" },
            },
          },
        ]);

        const totalReceived = payments[0]?.totalReceived || 0;

        if (totalReceived >= booking.paymentType2) {
          fullyReceivedBookings.push(booking);
        }
      }
    }

    res.status(200).json({
      success: true,
      count: fullyReceivedBookings.length,
      data: fullyReceivedBookings,
    });
  } catch (error) {
    console.error("Error in getFullyReceivedPaymentType2WithEMICreated:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching fully received Payment Type 2 bookings with EMI created",
    });
  }
};




// exports.getFullyReceivedPaymentType2 = async (req, res) => {
//   try {
//     // Step 1: Get all bookings
//     const bookings = await Booking.find();

//     const fullyReceivedBookings = [];

//     for (const booking of bookings) {
//       if (booking.paymentType2 === 0) {
//         // paymentType2 is zero, include directly
//         fullyReceivedBookings.push(booking);
//       } else {
//         // Calculate total received paymentType2 payments
//         const payments = await Payment.aggregate([
//           { $match: { bookingId: booking._id, paymentType: "Payment Type 2" } },
//           {
//             $group: {
//               _id: null,
//               totalReceived: { $sum: "$todayReceiving" },
//             },
//           },
//         ]);

//         const totalReceived = payments[0]?.totalReceived || 0;

//         if (totalReceived >= booking.paymentType2) {
//           fullyReceivedBookings.push(booking);
//         }
//       }
//     }

//     res.status(200).json({
//       success: true,
//       count: fullyReceivedBookings.length,
//       data: fullyReceivedBookings,
//     });
//   } catch (error) {
//     console.error("Error in getFullyReceivedPaymentType2:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while fetching fully received Payment Type 2 bookings",
//     });
//   }
// };




