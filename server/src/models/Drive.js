const mongoose = require('mongoose');
const { BRANCHES, JOB_TYPES, DRIVE_STATUSES } = require('../utils/constants');

const eligibilitySchema = new mongoose.Schema(
  {
    minCgpa: { type: Number, min: 0, max: 10, default: 0 },
    branches: { type: [{ type: String, enum: BRANCHES }], default: [] }, // empty = all branches
    graduationYear: { type: Number, default: null }, // null = any year
    maxBacklogs: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const driveSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    role: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    package: { type: Number, required: true, min: 0, max: 200 }, // CTC in LPA
    location: { type: String, trim: true, maxlength: 100, default: '' },
    jobType: { type: String, enum: JOB_TYPES, required: true },
    skills: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] }, // used for match scores
    eligibility: { type: eligibilitySchema, required: true, default: () => ({}) },
    deadline: { type: Date, required: true },
    driveDate: {
      type: Date,
      default: null,
      validate: {
        validator(value) {
          return !value || !this.deadline || value >= this.deadline;
        },
        message: 'Drive date must be on or after the deadline',
      },
    },
    status: { type: String, enum: DRIVE_STATUSES, default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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

driveSchema.index({ status: 1, deadline: 1 });
driveSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Drive', driveSchema);
