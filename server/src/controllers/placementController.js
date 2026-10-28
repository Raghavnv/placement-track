const asyncHandler = require('../utils/asyncHandler');
const PlacementPolicy = require('../models/PlacementPolicy');
const { TIERS, TIER_LABELS, getPolicy, placementFor } = require('../utils/placement');

const tiersFor = (policy) => [
  { key: TIERS[0], label: TIER_LABELS.regular, minPackage: 0, maxPackage: policy.dreamMinPackage },
  { key: TIERS[1], label: TIER_LABELS.dream, minPackage: policy.dreamMinPackage, maxPackage: policy.superDreamMinPackage },
  { key: TIERS[2], label: TIER_LABELS['super-dream'], minPackage: policy.superDreamMinPackage, maxPackage: null },
];

exports.getPolicy = asyncHandler(async (req, res) => {
  const policy = await getPolicy();
  res.json({ policy, tiers: tiersFor(policy) });
});

exports.updatePolicy = asyncHandler(async (req, res) => {
  await PlacementPolicy.findOneAndUpdate(
    { key: 'default' },
    { ...req.body, updatedBy: req.user._id },
    { upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  const policy = await getPolicy();
  res.json({ policy, tiers: tiersFor(policy) });
});

// The student's placement status: best offer, its tier, and what they may still apply to.
exports.myPlacement = asyncHandler(async (req, res) => {
  const { policy, offer, placed, minPackage, canApplyFullTime, message } = await placementFor(req.user);
  res.json({ placement: { placed, offer, minPackage, canApplyFullTime, message }, policy, tiers: tiersFor(policy) });
});
