const mongoose = require("mongoose");

const paymentReconciliationSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    emiId: { type: mongoose.Schema.Types.ObjectId, ref: "EMI", required: true },
    installmentNo: { type: Number, required: true },
    todayReceiving: { type: Number, required: true },
    utr: { type: String },
    bankDetail: { type: String },
    receivedDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentReconciliation", paymentReconciliationSchema);
