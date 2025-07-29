// const mongoose = require('mongoose');

// const projectSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   projectTypes: [{ type: String, required: true }],
//   address: { type: String, default: '' },
// }, { timestamps: true });

// module.exports = mongoose.model('Project', projectSchema);



const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  projectTypes: [{ type: String, required: true }],
  address: { type: String, default: '' },
  developer: { type: String, default: '' },
  maintenanceAgency: { type: String, default: '' },
  reraNos: { type: String, default: '' },
  offerOfPossession: { type: Date, default: null },
  constructionCompletionCommitment: { type: String, default: '' },
  delayCompensation: { type: String, default: '' },
  delayPenalty: { type: String, default: '' },
  maintenanceStartDate: { type: Date, default: null },
  possessionConditions: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
