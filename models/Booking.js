const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  projectName: { type: String, required: true },
  projectType: { type: String, required: true },
  clientName: { type: String, required: true },
  mobile: { type: String, required: true },
  salesExecutiveName: { type: String, required: true },
  unit: { type: String, required: true },
  paymentType1: { type: Number, required: true },
  paymentType2: { type: Number, required: true },
  totalDealCost: { type: Number, required: true },
  floor: { type: Number, required: true },
  // status: { type: String, default: "Active" },
  status: {
  type: String,
  enum: ["pending", "active", "cancel"],
  default: "pending",
},

  taskId: { type: String, required: true, unique: true } // 👈 added
});

module.exports = mongoose.model('Booking', bookingSchema);
