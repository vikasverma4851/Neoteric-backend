// models/Payment.js

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  // taskId: { type: String, required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },

  paymentType: { type: String, enum: ["Payment Type 1", "Payment Type 2"], required: true },
  totalReceived: { type: Number, required: true },
  todayReceiving: { type: Number, required: true },
  balanceAmount: { type: Number, required: true },
  paymentBy: { type: String, enum: ["Bank Account", "Cash", "Other Transaction"], required: true },
  chequeTransactionNo: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // <-- added
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
