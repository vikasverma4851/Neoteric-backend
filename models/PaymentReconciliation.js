const mongoose = require("mongoose");

const paymentReconciliationSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    emiId: { type: mongoose.Schema.Types.ObjectId, ref: "EMI", required: true },
    installmentNo: { type: String, required: true }, // Supports "-sub" suffix
    todayReceiving: { type: Number, required: true },
    utr: { type: String },
    bankDetail: { type: String },
    receivedDate: { type: Date, required: true },
    interest: { type: Number, default: 0 }, // Store interest
interestReceived: { type: Number, default: 0 },

    isSubInstallment: { type: Boolean, default: false },
    parentDueDate: { type: Date }, // For sub-installments
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const PaymentReconciliation = mongoose.model("PaymentReconciliation", paymentReconciliationSchema);

module.exports = PaymentReconciliation;




