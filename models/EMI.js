const mongoose = require("mongoose");

const installmentSchema = new mongoose.Schema({
  installmentNo: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date },
  totalReceived: { type: Number, default: 0 },
  balance: { type: Number, required: true },
  interest: { type: Number, default: 0 }, // Store interest
  totalInterestReceived: { type: Number, default: 0 },

  paid: { type: Boolean, default: false },
  isSubInstallment: { type: Boolean, default: false },
  parentDueDate: { type: Date },
  commitmentDate: { type: Date },
});

const emiSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    installments: [installmentSchema],
  },
  { timestamps: true }
);

const EMI = mongoose.model("EMI", emiSchema);

module.exports = EMI;






