const Booking = require("../models/Booking");
const PaymentReconciliation = require("../models/PaymentReconciliation");
const Payment = require("../models/Payment");

exports.getDashboardStats = async (req, res) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // 1. Total Active Bookings
    const totalActiveBookings = await Booking.countDocuments({ status: "active" });

    // 2. New Bookings This Month
    const newBookingsThisMonth = await Booking.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
        // total bookings
        const totalBookings = await Booking.countDocuments({ });


    // 3. Payment Type 1 Bookings & Amounts (unchanged)
    const paymentType1Bookings = await Booking.find({ paymentType1: { $exists: true } });
    const paymentType1Ids = paymentType1Bookings.map(b => b._id);
    const totalPaymentType1Received = await PaymentReconciliation.aggregate([
      { $match: { bookingId: { $in: paymentType1Ids } } },
      { $group: { _id: null, total: { $sum: "$todayReceiving" } } }
    ]);
    const totalPaymentType1Deal = paymentType1Bookings.reduce((sum, b) => sum + (b.paymentType1 || 0), 0);
    const pendingPaymentType1 = totalPaymentType1Deal - (totalPaymentType1Received[0]?.total || 0);

 // 4. Payment Type 2 Bookings & Amounts (using Payment model)
const paymentType2Bookings = await Booking.find({ paymentType2: { $exists: true } });
const paymentType2Ids = paymentType2Bookings.map(b => b._id);

const totalPaymentType2Received = await Payment.aggregate([
  { $match: { bookingId: { $in: paymentType2Ids }, paymentType: "Payment Type 2" } },
  { $group: { _id: null, total: { $sum: "$todayReceiving" } } }
]);

const totalPaymentType2Deal = paymentType2Bookings.reduce(
  (sum, b) => sum + (b.paymentType2 || 0),
  0
);

const pendingPaymentType2 = totalPaymentType2Deal - (totalPaymentType2Received[0]?.total || 0);

    // Send response
    res.json({
      totalActiveBookings,
      newBookingsThisMonth,
      totalBookings,
      paymentType1: {
        totalBookings: paymentType1Bookings.length,
        totalDeal: totalPaymentType1Deal,
        totalReceived: totalPaymentType1Received[0]?.total || 0,
        pending: pendingPaymentType1
      },
      paymentType2: {
        totalBookings: paymentType2Bookings.length,
        totalDeal: totalPaymentType2Deal,
        totalReceived: totalPaymentType2Received[0]?.total || 0,
        pending: pendingPaymentType2
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
