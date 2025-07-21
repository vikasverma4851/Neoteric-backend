// models/NOCHistory.js
const mongoose = require("mongoose");

const nocHistorySchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  clientId: { type: String, required: true },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  remarks: { type: String },
  status: { type: String, enum: ["Granted", "Revoked"], default: "Granted" },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("NOCHistory", nocHistorySchema);
