const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  projectType: { type: String, required: true },
  
},{timestamps:true});

module.exports = mongoose.model('Project', projectSchema);