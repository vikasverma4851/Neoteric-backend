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
  // tower: { type: String },
  tower: { type: String, default: "N/A" },

  // status: { type: String, default: "Active" },

   aadharNumber: { type: String, required: true },    // 👈 added
  aadharCopy: { type: String, required: true },      // 👈 added
  panNumber: { type: String, required: true },       // 👈 added
  panCopy: { type: String, required: true },         // 👈 added

  status: {
  type: String,
  enum: ["pending", "active", "rejected"],
  default: "pending",
},
remark:{type:String },
  taskId: { type: String, required: true, unique: true }, // 👈 added
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // <-- added

    //Grant NOC   

nocGranted: { type: Boolean, default: false },
nocGrantedOn: { type: Date },
nocGrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
nocRemarks: { type: String },
proceedToNoDue: { type: Boolean, default: false },


}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
