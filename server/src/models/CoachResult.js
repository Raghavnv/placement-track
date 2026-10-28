const mongoose = require('mongoose');

// Saved AI coach answers, so the same resume isn't sent to the AI again for the same question.
// kind "review": one per student. kind "fit": one per student per drive/job (target "drive:<id>" or "job:<id>").
// resumeUploadedAt ties an answer to the resume it was made from; a new upload makes it stale.
const coachResultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['review', 'fit'], required: true },
    target: { type: String, default: '' },
    resumeUploadedAt: { type: Date, required: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

coachResultSchema.index({ student: 1, kind: 1, target: 1 }, { unique: true });

module.exports = mongoose.model('CoachResult', coachResultSchema);
