const mongoose = require("mongoose");

const paymentHistorySchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    emiId: { type: mongoose.Schema.Types.ObjectId, ref: "EMI", required: true },
    installmentNo: { type: Number, required: true },
    clientId: { type: String},
    mobileNo: { type: String },
    emis: { type: Number }, // installmentNo or sequence
    installmentAmt: { type: Number },
    amtReceived: { type: Number, required: true },
    utr: { type: String },
    bankDetails: { type: String },
    receivingDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true , collection: "PaymentHistory"}
);

module.exports = mongoose.model("PaymentHistory", paymentHistorySchema);
