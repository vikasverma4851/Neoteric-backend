const mongoose = require("mongoose");

const paymentHistorySchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    emiId: { type: mongoose.Schema.Types.ObjectId, ref: "EMI", required: true },
    installmentNo: { type: String, required: true },
    clientId: { type: String, required: true },
    mobileNo: { type: String, required: true },
    emis: { type: String, required: true },
    installmentAmt: { type: Number, required: true },
    interest: { type: Number, default: 0 }, // Store interest
    amtReceived: { type: Number, required: true },
    utr: { type: String },
    bankDetails: { type: String },
    receivingDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const PaymentHistory = mongoose.model("PaymentHistory", paymentHistorySchema);

module.exports = PaymentHistory;



// const mongoose = require("mongoose");

// const paymentHistorySchema = new mongoose.Schema(
//   {
//     bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
//     emiId: { type: mongoose.Schema.Types.ObjectId, ref: "EMI", required: true },
//     // installmentNo: { type: Number, required: true },
//     installmentNo: { type: String, required: true },
//     clientId: { type: String},
//     mobileNo: { type: String },
//     // emis: { type: Number }, // installmentNo or sequence
//     emis: { type: String }, // installmentNo or sequence
//     installmentAmt: { type: Number },
//     amtReceived: { type: Number, required: true },
//     utr: { type: String },
//     bankDetails: { type: String },
//     receivingDate: { type: Date, required: true },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   },
//   { timestamps: true , collection: "PaymentHistory"}
// );

// module.exports = mongoose.model("PaymentHistory", paymentHistorySchema);
