const mongoose = require('mongoose');

// The placement cell's offer policy (one document, key "default"). Drives are tiered by package:
// Regular below dreamMinPackage, Dream from it, Super Dream from superDreamMinPackage (LPA).
// With the policy on, a student holding a full-time offer may only apply to full-time drives in a higher tier.
const placementPolicySchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    enabled: { type: Boolean, default: true },
    dreamMinPackage: { type: Number, min: 0.5, max: 200, default: 8 },
    superDreamMinPackage: { type: Number, min: 1, max: 200, default: 15 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('PlacementPolicy', placementPolicySchema);
