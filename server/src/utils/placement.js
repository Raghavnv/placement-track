const PlacementPolicy = require('../models/PlacementPolicy');
const Application = require('../models/Application');

// Placement policy (api-contract.md 3d): drive tiers and who may apply after getting an offer.
const TIERS = ['regular', 'dream', 'super-dream'];
const TIER_LABELS = { regular: 'Regular', dream: 'Dream', 'super-dream': 'Super Dream' };
const DEFAULT_POLICY = { enabled: true, dreamMinPackage: 8, superDreamMinPackage: 15 };

function tierOf(pkg, policy) {
  if (pkg >= policy.superDreamMinPackage) return 'super-dream';
  if (pkg >= policy.dreamMinPackage) return 'dream';
  return 'regular';
}

async function getPolicy() {
  const doc = await PlacementPolicy.findOne({ key: 'default' }).lean();
  if (!doc) return { ...DEFAULT_POLICY, updatedAt: null };
  const { enabled, dreamMinPackage, superDreamMinPackage, updatedAt } = doc;
  return { enabled, dreamMinPackage, superDreamMinPackage, updatedAt };
}

// The student's best full-time campus offer (highest package), or null. Internship offers don't count.
async function bestOffer(studentId) {
  const offers = await Application.find({ student: studentId, stage: 'offer' })
    .populate('drive', 'companyName role package jobType')
    .lean();
  const best = offers
    .filter((a) => a.drive?.jobType === 'full-time')
    .sort((a, b) => b.drive.package - a.drive.package)[0];
  return best
    ? { applicationId: best._id, driveId: best.drive._id, companyName: best.drive.companyName, role: best.drive.role, package: best.drive.package }
    : null;
}

// Lowest package a full-time drive needs for this student to apply: 0 = no limit, Infinity = none allowed.
function minPackageFor({ policy, offer }) {
  if (!policy.enabled || !offer) return 0;
  if (offer.tier === 'regular') return policy.dreamMinPackage;
  if (offer.tier === 'dream') return policy.superDreamMinPackage;
  return Infinity;
}

// Everything the eligibility rules and the UI need about a student's placement, loaded once per request.
async function placementFor(student) {
  const [policy, offer] = await Promise.all([getPolicy(), bestOffer(student._id)]);
  const placement = { policy, offer: offer && { ...offer, tier: tierOf(offer.package, policy) } };
  const min = minPackageFor(placement);
  placement.placed = Boolean(offer);
  placement.minPackage = Number.isFinite(min) ? min : null;
  placement.canApplyFullTime = min !== Infinity;
  placement.message = message(placement, min);
  return placement;
}

function message({ policy, offer }, min) {
  if (!offer) return null;
  const held = `You hold a ${TIER_LABELS[offer.tier]} offer from ${offer.companyName} (₹${offer.package} LPA).`;
  if (!policy.enabled) return `${held} The placement cell's offer policy is off, so every drive is open to you.`;
  if (min === Infinity) return `${held} That's the top tier, so you're done with full-time campus drives. Internships stay open.`;
  const next = tierOf(min, policy);
  return `${held} By placement policy you can now apply only to ${TIER_LABELS[next]}+ full-time drives (₹${min} LPA and above). Internships stay open.`;
}

// placementFor for many students at once (two queries), as a Map of studentId -> { policy, offer }.
// Enough for checkEligibility; skips the per-student message.
async function placementsFor(studentIds) {
  const [policy, offers] = await Promise.all([
    getPolicy(),
    Application.find({ student: { $in: studentIds }, stage: 'offer' }).populate('drive', 'companyName package jobType').lean(),
  ]);
  const best = new Map();
  for (const a of offers) {
    if (a.drive?.jobType !== 'full-time') continue;
    const key = a.student.toString();
    if (!best.has(key) || a.drive.package > best.get(key).package) best.set(key, a.drive);
  }
  return new Map(
    studentIds.map((id) => {
      const drive = best.get(id.toString());
      const offer = drive && { companyName: drive.companyName, package: drive.package, tier: tierOf(drive.package, policy) };
      return [id.toString(), { policy, offer: offer || null }];
    }),
  );
}

// One eligibility check row for the drive checklist, or null when the policy doesn't apply to this drive.
function policyCheck(placement, drive) {
  if (!placement || drive.jobType !== 'full-time') return null;
  const min = minPackageFor(placement);
  if (!min) return null;
  const { offer, policy } = placement;
  return {
    field: 'policy',
    label: min === Infinity ? 'No Super Dream offer held (placement policy)' : `${TIER_LABELS[tierOf(min, policy)]}+ drive (placement policy)`,
    actual: `${TIER_LABELS[offer.tier]} offer, ${offer.companyName}`,
    passed: drive.package >= min,
  };
}

// The same rule as a MongoDB condition, for "eligible only" lists and reminders.
function policyCondition(placement) {
  const min = placement ? minPackageFor(placement) : 0;
  if (!min) return null;
  if (min === Infinity) return { jobType: { $ne: 'full-time' } };
  return { $or: [{ jobType: { $ne: 'full-time' } }, { package: { $gte: min } }] };
}

module.exports = { TIERS, TIER_LABELS, DEFAULT_POLICY, tierOf, getPolicy, bestOffer, placementFor, placementsFor, policyCheck, policyCondition };
