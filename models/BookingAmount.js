const mongoose = require('mongoose');

const bookingAmountSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  receivingDate: { type: Date, required: true },
  transferType: { 
    type: String, 
    enum: ['Bank Account', 'Cash', 'Other Transaction'], 
    required: true 
  },
  bankDetails: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('BookingAmount', bookingAmountSchema);