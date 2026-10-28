const mongoose = require('mongoose');

const RESULTS = ['selected', 'not-selected', 'awaiting'];

// Matching key for a company, so "Zoho Corporation", "ZOHO" and "Zoho Corp." are the same company.
const SUFFIXES = /\b(pvt|private|ltd|limited|inc|llp|llc|corp|corporation|co|company|technologies|technology|tech|solutions|software|services|india)\b/g;
const companyKey = (name) =>
  String(name || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(SUFFIXES, ' ').replace(/\s+/g, ' ').trim();

const roundSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 }, // e.g. "Online test", "Technical interview 1"
    details: { type: String, required: true, trim: true, maxlength: 1500 },
  },
  { _id: false },
);

// A student's write-up of one company's selection process, for juniors preparing for the same drive.
const experienceSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    anonymous: { type: Boolean, default: false },
    companyName: { type: String, required: true, trim: true, maxlength: 100 },
    companyKey: { type: String, required: true, index: true },
    role: { type: String, required: true, trim: true, maxlength: 100 },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', default: null },
    year: { type: Number, required: true, min: 2015, max: 2040 },
    result: { type: String, enum: RESULTS, required: true },
    difficulty: { type: Number, min: 1, max: 5, required: true },
    rounds: { type: [roundSchema], validate: [(r) => r.length >= 1 && r.length <= 8, 'Add between 1 and 8 rounds'] },
    tips: { type: String, trim: true, maxlength: 1500, default: '' },
  },
  { timestamps: true },
);

experienceSchema.index({ createdAt: -1 });
experienceSchema.pre('validate', function setKey(next) {
  this.companyKey = companyKey(this.companyName);
  next();
});

module.exports = mongoose.model('Experience', experienceSchema);
module.exports.RESULTS = RESULTS;
module.exports.companyKey = companyKey;
