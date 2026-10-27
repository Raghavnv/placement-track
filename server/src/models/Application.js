const mongoose = require('mongoose');
const { STAGES } = require('../utils/stages');

const stageEventSchema = new mongoose.Schema(
  {
    stage: { type: String, enum: STAGES, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remark: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', required: true },
    stage: { type: String, enum: STAGES, default: 'applied' },
    stageHistory: { type: [stageEventSchema], default: [] },
    notes: { type: String, maxlength: 5000, default: '' }, // private to the student
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// One application per student per drive, enforced by the database (handles double-clicks/races).
applicationSchema.index({ student: 1, drive: 1 }, { unique: true });
applicationSchema.index({ drive: 1, stage: 1 });
applicationSchema.index({ student: 1, updatedAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
