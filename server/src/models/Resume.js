const mongoose = require('mongoose');

// The resume file itself. Kept out of the User document so loading a user never pulls the file bytes.
// The file's name, type and size live on User.resume for display.
const resumeSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Resume', resumeSchema);
