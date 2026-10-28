const asyncHandler = require('../utils/asyncHandler');
const { STAGE_LABELS } = require('../utils/stages');
const { round, packageStats } = require('../utils/stats');
const { getPolicy, tierOf, TIERS, TIER_LABELS } = require('../utils/placement');
const Application = require('../models/Application');
const Drive = require('../models/Drive');
const User = require('../models/User');

const FUNNEL_STAGES = ['applied', 'aptitude', 'interview', 'offer'];
const rate = (part, whole) => (whole ? round((part / whole) * 100) : 0);

// Season placement report for officers (and for NIRF / NAAC returns). A student is placed by their
// best full-time offer; package figures use that one offer per placed student, as NIRF does.
exports.placementReport = asyncHandler(async (req, res) => {
  const { graduationYear } = req.query;
  const studentFilter = { role: 'student', ...(graduationYear ? { graduationYear } : {}) };

  const [students, policy, drives] = await Promise.all([
    User.find(studentFilter).select('name rollNumber branch cgpa backlogs graduationYear').sort({ branch: 1, rollNumber: 1 }).lean(),
    getPolicy(),
    Drive.countDocuments(),
  ]);
  const studentIds = students.map((s) => s._id);
  const applications = await Application.find({ student: { $in: studentIds } })
    .select('student drive stage stageHistory.stage')
    .populate('drive', 'companyName role package jobType')
    .lean();

  // Per student: applications, active ones, offers (full-time and internship).
  const byStudent = new Map(students.map((s) => [s._id.toString(), { applications: 0, active: 0, fullTime: [], internships: 0 }]));
  for (const a of applications) {
    const row = byStudent.get(a.student.toString());
    if (!row || !a.drive) continue;
    row.applications += 1;
    if (!['offer', 'rejected'].includes(a.stage)) row.active += 1;
    if (a.stage === 'offer') {
      if (a.drive.jobType === 'full-time') row.fullTime.push(a.drive);
      else row.internships += 1;
    }
  }
  const bestOffer = (row) => row.fullTime.reduce((best, d) => (!best || d.package > best.package ? d : best), null);

  const placed = students.filter((s) => byStudent.get(s._id.toString()).fullTime.length);
  const bestPackages = placed.map((s) => bestOffer(byStudent.get(s._id.toString())).package);
  const fullTimeOffers = [...byStudent.values()].reduce((n, r) => n + r.fullTime.length, 0);
  const internshipOffers = [...byStudent.values()].reduce((n, r) => n + r.internships, 0);

  // Branch-wise placement and median package.
  const branches = new Map();
  for (const s of students) {
    const row = branches.get(s.branch) || { branch: s.branch, students: 0, placed: 0, packages: [] };
    row.students += 1;
    const best = bestOffer(byStudent.get(s._id.toString()));
    if (best) {
      row.placed += 1;
      row.packages.push(best.package);
    }
    branches.set(s.branch, row);
  }
  const byBranch = [...branches.values()]
    .map(({ packages, ...row }) => ({ ...row, rate: rate(row.placed, row.students), median: packageStats(packages).median }))
    .sort((a, b) => b.students - a.students || a.branch.localeCompare(b.branch));

  // Placed students by the tier of their best offer.
  const tierCounts = Object.fromEntries(TIERS.map((t) => [t, 0]));
  bestPackages.forEach((p) => { tierCounts[tierOf(p, policy)] += 1; });
  const byTier = TIERS.map((tier) => ({ tier, label: TIER_LABELS[tier], students: tierCounts[tier] }));

  // Companies that made offers to this batch.
  const companies = new Map();
  for (const a of applications) {
    if (a.stage !== 'offer' || !a.drive) continue;
    const row = companies.get(a.drive.companyName) || { companyName: a.drive.companyName, offers: 0, highest: 0, roles: new Set() };
    row.offers += 1;
    row.highest = Math.max(row.highest, a.drive.package);
    row.roles.add(a.drive.role);
    companies.set(a.drive.companyName, row);
  }
  const byCompany = [...companies.values()]
    .map(({ roles, ...row }) => ({ ...row, roles: [...roles] }))
    .sort((a, b) => b.offers - a.offers || b.highest - a.highest);

  // How many applications ever reached each round (from stage history).
  const reached = Object.fromEntries(FUNNEL_STAGES.map((s) => [s, 0]));
  applications.forEach((a) => {
    new Set(a.stageHistory.map((h) => h.stage)).forEach((s) => { if (s in reached) reached[s] += 1; });
  });
  const funnel = FUNNEL_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    reached: reached[stage],
    percentOfApplied: rate(reached[stage], reached.applied),
  }));

  const unplaced = students
    .filter((s) => !byStudent.get(s._id.toString()).fullTime.length)
    .map((s) => {
      const row = byStudent.get(s._id.toString());
      return { _id: s._id, name: s.name, rollNumber: s.rollNumber, branch: s.branch, cgpa: s.cgpa, backlogs: s.backlogs, applications: row.applications, active: row.active };
    });

  res.json({
    generatedAt: new Date(),
    graduationYear: graduationYear || null,
    policy: { dreamMinPackage: policy.dreamMinPackage, superDreamMinPackage: policy.superDreamMinPackage },
    summary: {
      students: students.length,
      placed: placed.length,
      placementRate: rate(placed.length, students.length),
      fullTimeOffers,
      internshipOffers,
      multipleOffers: placed.filter((s) => byStudent.get(s._id.toString()).fullTime.length > 1).length,
      companies: byCompany.length,
      drives,
      applications: applications.length,
    },
    packages: packageStats(bestPackages),
    byBranch,
    byTier,
    byCompany,
    funnel,
    unplaced,
  });
});
