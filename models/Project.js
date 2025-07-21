const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  projectTypes: [{ type: String, required: true }],
  address: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);