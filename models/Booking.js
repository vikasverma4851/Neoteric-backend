const mongoose = require('mongoose');

const coAllotteeSchema = new mongoose.Schema({
  dob: { type: String },
  age: { type: String },
  profession: { type: String },
  panNumber: { type: String },
  aadharNumber: { type: String },
  panCopy: { type: String },
  aadharCopy: { type: String },
  email: { type: String },
  mobile: { type: String },
  address: { type: String },
});

const bookingSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  projectName: { type: String, required: true, trim: true },
  projectType: { type: String, required: true, trim: true },
  clientName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  salesExecutiveName: { type: String, required: true, trim: true },
  unit: { type: String, required: true, trim: true },
  paymentType1: { type: Number, required: true },
  paymentType2: { type: Number, required: true },
  totalDealCost: { type: Number, required: true },
  tower: { type: String, default: 'N/A', trim: true },
  flatNo: { type: String, trim: true },
  floor: { type: String, trim: true },
  builtUpArea: { type: String, trim: true },
  parkingCategory: { type: String, trim: true },
  unitFacing: { type: String, trim: true },
  apartmentType: { type: String, trim: true },
  location: { type: String, trim: true },
  reraNos: { type: String, trim: true },
  parkingLocations: { type: String, trim: true },
  basePrice: { type: String, trim: true },
  gstOnBase: { type: String, trim: true },
  totalBaseGst: { type: String, trim: true },
  bookingAmount: { type: String, trim: true },
  duePayment: { type: String, trim: true },
  maintenanceOtherCharges: { type: String, trim: true },
  totalAmountAllIn: { type: String, trim: true },
  paymentMode: { type: String, trim: true },
  interestOnDelay: { type: String, default: '11', trim: true },
  mutationSecurity: { type: String, trim: true },
  offerOfPossession: { type: String, trim: true },
  constructionCompletionCommitment: { type: String, trim: true },
  delayCompensationDeveloper: { type: String, trim: true },
  delayPenaltyCustomer: { type: String, trim: true },
  maintenanceStartDate: { type: String, trim: true },
  possessionConditions: { type: String, trim: true },
  agreementType: { type: String, trim: true },
  developer: { type: String, trim: true },
  maintenanceAgency: { type: String, trim: true },
  earnestMoney: { type: String, trim: true },
  ibms: { type: String, trim: true },
  clubCharges: { type: String, trim: true },
  externalElectrification: { type: String, trim: true },
  legalCharges: { type: String, trim: true },
  nonRefundableComponents: { type: String, trim: true },
  arbitrationLocation: { type: String, trim: true },
  governingAct: { type: String, trim: true },
  age: { type: String, trim: true },
  dob: { type: String, trim: true },
  profession: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  relativeName: { type: String, trim: true },
  aadharNumber: { type: String, trim: true },
  aadharCopy: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  panCopy: { type: String, trim: true },
  coAllottees: [coAllotteeSchema],
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected'],
    default: 'pending',
  },
  remark: { type: String, trim: true },
  taskId: { type: String, required: true, unique: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nocGranted: { type: Boolean, default: false },
  nocGrantedOn: { type: Date },
  nocGrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  nocRemarks: { type: String, trim: true },
  proceedToNoDue: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);






// const mongoose = require('mongoose');

// const bookingSchema = new mongoose.Schema({
//   timestamp: { type: Date, default: Date.now },
//   projectName: { type: String, required: true },
//   projectType: { type: String, required: true },
//   clientName: { type: String, required: true },
//   mobile: { type: String, required: true },
//   salesExecutiveName: { type: String, required: true },
//   unit: { type: String, required: true },
//   paymentType1: { type: Number, required: true },
//   paymentType2: { type: Number, required: true },
//   totalDealCost: { type: Number, required: true },
//   // tower: { type: String },
//   tower: { type: String, default: "N/A" },

//   // status: { type: String, default: "Active" },

//    aadharNumber: { type: String, required: true },    // 👈 added
//   aadharCopy: { type: String, required: true },      // 👈 added
//   panNumber: { type: String, required: true },       // 👈 added
//   panCopy: { type: String, required: true },         // 👈 added

//   status: {
//   type: String,
//   enum: ["pending", "active", "rejected"],
//   default: "pending",
// },
// remark:{type:String },
//   taskId: { type: String, required: true, unique: true }, // 👈 added
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // <-- added

//     //Grant NOC   

// nocGranted: { type: Boolean, default: false },
// nocGrantedOn: { type: Date },
// nocGrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
// nocRemarks: { type: String },
// proceedToNoDue: { type: Boolean, default: false },


// }, { timestamps: true });

// module.exports = mongoose.model('Booking', bookingSchema);
