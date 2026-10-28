const mongoose = require('mongoose');

// A student's resume-builder content (validated by validators/resumeBuilderSchemas.js), saved as they edit.
const resumeDraftSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ResumeDraft', resumeDraftSchema);
