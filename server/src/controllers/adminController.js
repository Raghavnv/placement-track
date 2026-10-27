const asyncHandler = require('../utils/asyncHandler');
const { emptyStageCounts, STAGE_LABELS } = require('../utils/stages');
const Application = require('../models/Application');
const Drive = require('../models/Drive');
const User = require('../models/User');

const FUNNEL_STAGES = ['applied', 'aptitude', 'interview', 'offer'];
const round = (n, places = 1) => Math.round(n * 10 ** places) / 10 ** places;

function packageStats(packages) {
  if (!packages.length) return { highest: 0, average: 0, median: 0 };
  const sorted = [...packages].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    highest: sorted[sorted.length - 1],
    average: round(sorted.reduce((sum, p) => sum + p, 0) / sorted.length, 2),
    median: sorted.length % 2 ? sorted[mid] : round((sorted[mid - 1] + sorted[mid]) / 2, 2),
  };
}

const lookupDrive = [
  { $lookup: { from: 'drives', localField: 'drive', foreignField: '_id', as: 'drive' } },
  { $unwind: '$drive' },
];

exports.stats = asyncHandler(async (req, res) => {
  const { graduationYear } = req.query;
  const now = new Date();

  const studentFilter = { role: 'student' };
  if (graduationYear) studentFilter.graduationYear = graduationYear;
  const appMatch = graduationYear ? { student: { $in: await User.find(studentFilter).distinct('_id') } } : {};

  const [students, drives, openDrives, stageRows, placedIds, offerPackages, funnelRows, topDrives, upcoming] =
    await Promise.all([
      User.countDocuments(studentFilter),
      Drive.countDocuments(),
      Drive.countDocuments({ status: 'open', deadline: { $gte: now } }),
      Application.aggregate([{ $match: appMatch }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
      Application.distinct('student', { ...appMatch, stage: 'offer' }),
      Application.aggregate([
        { $match: { ...appMatch, stage: 'offer' } },
        ...lookupDrive,
        { $project: { _id: 0, package: '$drive.package' } },
      ]),
      // How many applications ever reached each stage (from history, not just the current stage).
      Application.aggregate([
        { $match: appMatch },
        { $unwind: '$stageHistory' },
        { $group: { _id: '$stageHistory.stage', reached: { $sum: 1 } } },
      ]),
      Application.aggregate([
        { $match: appMatch },
        {
          $group: {
            _id: '$drive',
            applicants: { $sum: 1 },
            offers: { $sum: { $cond: [{ $eq: ['$stage', 'offer'] }, 1, 0] } },
          },
        },
        { $sort: { applicants: -1, _id: 1 } },
        { $limit: 5 },
        { $lookup: { from: 'drives', localField: '_id', foreignField: '_id', as: 'drive' } },
        { $unwind: '$drive' },
        { $project: { _id: 0, driveId: '$_id', companyName: '$drive.companyName', role: '$drive.role', applicants: 1, offers: 1 } },
      ]),
      Drive.find({ status: 'open', deadline: { $gte: now } }).sort({ deadline: 1 }).limit(5).select('companyName role deadline').lean(),
    ]);

  const placedByBranch = await User.aggregate([
    { $match: studentFilter },
    {
      $group: {
        _id: '$branch',
        total: { $sum: 1 },
        placed: { $sum: { $cond: [{ $in: ['$_id', placedIds] }, 1, 0] } },
      },
    },
    { $sort: { total: -1, _id: 1 } },
    { $project: { _id: 0, branch: '$_id', placed: 1, total: 1 } },
  ]);

  const applicationsByStage = emptyStageCounts();
  stageRows.forEach((row) => { applicationsByStage[row._id] = row.count; });
  const applications = Object.values(applicationsByStage).reduce((sum, n) => sum + n, 0);

  const reached = Object.fromEntries(funnelRows.map((row) => [row._id, row.reached]));
  const appliedCount = reached.applied || 0;
  const funnel = FUNNEL_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    reached: reached[stage] || 0,
    percentOfApplied: appliedCount ? round(((reached[stage] || 0) / appliedCount) * 100) : 0,
  }));

  const upcomingCounts = await Application.countByDrive(upcoming.map((d) => d._id));

  res.json({
    totals: {
      students,
      drives,
      openDrives,
      applications,
      offers: applicationsByStage.offer,
      studentsPlaced: placedIds.length,
    },
    placementRate: students ? round((placedIds.length / students) * 100) : 0,
    packageStats: packageStats(offerPackages.map((o) => o.package)),
    applicationsByStage,
    funnel,
    placedByBranch,
    topDrives,
    upcomingDeadlines: upcoming.map((d) => ({
      driveId: d._id,
      companyName: d.companyName,
      role: d.role,
      deadline: d.deadline,
      applicants: upcomingCounts.get(d._id.toString()) || 0,
    })),
  });
});
