const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { checkEligibility, eligibilityFilter } = require('../utils/eligibility');
const { computeMatch } = require('../utils/matching');
const { emptyStageCounts } = require('../utils/stages');
const { containsRegex, paginationMeta } = require('../utils/query');
const { DRIVE_SUMMARY_FIELDS } = require('../utils/constants');
const Drive = require('../models/Drive');
const Application = require('../models/Application');
const Announcement = require('../models/Announcement');
const User = require('../models/User');

const SORTS = {
  deadline: { deadline: 1, _id: 1 },
  '-createdAt': { createdAt: -1 },
  '-package': { package: -1, deadline: 1 },
};

const isStudent = (user) => user.role === 'student';

async function findDriveOr404(id) {
  const drive = await Drive.findById(id);
  if (!drive) throw new ApiError(404, 'NOT_FOUND', 'Drive not found');
  return drive;
}

// Adds applicantCount to every drive, plus isEligible/hasApplied for students.
async function decorate(drives, user) {
  const ids = drives.map((d) => d._id);
  const counts = await Application.countByDrive(ids);
  const applied = isStudent(user)
    ? new Set((await Application.find({ student: user._id, drive: { $in: ids } }).distinct('drive')).map(String))
    : null;

  return drives.map((drive) => {
    const out = { ...drive, applicantCount: counts.get(drive._id.toString()) || 0 };
    if (applied) {
      const match = computeMatch(user, drive);
      out.isEligible = checkEligibility(user, drive).eligible;
      out.hasApplied = applied.has(drive._id.toString());
      out.matchScore = match.score;
      out.matchReasons = match.reasons;
    }
    return out;
  });
}

exports.listDrives = asyncHandler(async (req, res) => {
  const { status, search, jobType, minPackage, eligibleOnly, sort, page, limit } = req.query;
  const filter = {};

  if (status && status !== 'all') filter.status = status;
  if (!status && isStudent(req.user)) {
    // Students browse what they can still apply to: open and before the deadline.
    filter.status = 'open';
    filter.deadline = { $gte: new Date() };
  }
  if (search) filter.$or = [{ companyName: containsRegex(search) }, { role: containsRegex(search) }];
  if (jobType) filter.jobType = jobType;
  if (minPackage !== undefined) filter.package = { $gte: minPackage };
  if (eligibleOnly && isStudent(req.user)) Object.assign(filter, eligibilityFilter(req.user));

  if (sort === 'match' && isStudent(req.user)) {
    // Match scores are computed per student, so rank in memory (drive counts are small).
    const all = await decorate(await Drive.find(filter).select('-__v').sort(SORTS.deadline).lean(), req.user);
    all.sort((a, b) => b.matchScore - a.matchScore || a.deadline - b.deadline);
    res.json({ data: all.slice((page - 1) * limit, page * limit), pagination: paginationMeta(page, limit, all.length) });
    return;
  }

  const [total, drives] = await Promise.all([
    Drive.countDocuments(filter),
    Drive.find(filter).select('-__v').sort(SORTS[sort] || SORTS.deadline).skip((page - 1) * limit).limit(limit).lean(),
  ]);

  res.json({ data: await decorate(drives, req.user), pagination: paginationMeta(page, limit, total) });
});

exports.getDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id).select('-__v').lean();
  if (!drive) throw new ApiError(404, 'NOT_FOUND', 'Drive not found');

  const [decorated] = await decorate([drive], req.user);
  if (isStudent(req.user)) decorated.eligibilityChecks = checkEligibility(req.user, drive).checks;

  res.json({ drive: decorated });
});

exports.createDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.create({ ...req.body, status: 'open', createdBy: req.user._id });
  res.status(201).json({ drive: { ...drive.toJSON(), applicantCount: 0 } });
});

exports.updateDrive = asyncHandler(async (req, res) => {
  const drive = await findDriveOr404(req.params.id);
  const { eligibility, ...fields } = req.body;

  drive.set(fields);
  if (eligibility) drive.eligibility = { ...drive.eligibility.toObject(), ...eligibility };
  await drive.save(); // runs model validators, e.g. driveDate >= deadline against stored values

  const [decorated] = await decorate([drive.toJSON()], req.user);
  res.json({ drive: decorated });
});

exports.deleteDrive = asyncHandler(async (req, res) => {
  const drive = await findDriveOr404(req.params.id);
  const [{ deletedCount }] = await Promise.all([
    Application.deleteMany({ drive: drive._id }),
    Announcement.deleteMany({ drive: drive._id }),
  ]);
  await drive.deleteOne();
  res.json({ message: 'Drive deleted', deletedApplications: deletedCount });
});

exports.applyToDrive = asyncHandler(async (req, res) => {
  const drive = await findDriveOr404(req.params.id);

  if (drive.status === 'closed') {
    throw new ApiError(409, 'DRIVE_CLOSED', 'This drive is no longer accepting applications');
  }
  if (drive.deadline < new Date()) {
    throw new ApiError(400, 'DEADLINE_PASSED', 'The application deadline for this drive has passed');
  }

  const { eligible, checks } = checkEligibility(req.user, drive);
  if (!eligible) {
    const failed = checks.filter((c) => !c.passed).map((c) => ({ field: c.field, message: `Requires ${c.label}` }));
    throw new ApiError(403, 'NOT_ELIGIBLE', "You don't meet the eligibility criteria for this drive", failed);
  }

  if (await Application.exists({ student: req.user._id, drive: drive._id })) {
    throw new ApiError(409, 'ALREADY_APPLIED', 'You have already applied to this drive');
  }

  // The unique index still guards against two simultaneous requests (mapped to 409 by errorHandler).
  const application = await Application.create({
    student: req.user._id,
    drive: drive._id,
    stage: 'applied',
    stageHistory: [{ stage: 'applied', changedBy: req.user._id }],
  });
  await application.populate('drive', DRIVE_SUMMARY_FIELDS);

  res.status(201).json({ application });
});

exports.getApplicants = asyncHandler(async (req, res) => {
  const { stage, search, page, limit } = req.query;
  const drive = await Drive.findById(req.params.id).select('companyName role package deadline driveDate status').lean();
  if (!drive) throw new ApiError(404, 'NOT_FOUND', 'Drive not found');

  const stageRows = await Application.aggregate([
    { $match: { drive: drive._id } },
    { $group: { _id: '$stage', count: { $sum: 1 } } },
  ]);
  const stageCounts = emptyStageCounts();
  stageRows.forEach((row) => { stageCounts[row._id] = row.count; });

  const match = { drive: drive._id };
  if (stage) match.stage = stage;
  if (search) {
    const rx = containsRegex(search);
    match.student = { $in: await User.find({ role: 'student', $or: [{ name: rx }, { rollNumber: rx }] }).distinct('_id') };
  }

  const [total, applicants] = await Promise.all([
    Application.countDocuments(match),
    Application.find(match)
      .select('student stage stageHistory createdAt updatedAt') // never notes: they are private to the student
      .populate('student', 'name email rollNumber branch cgpa backlogs graduationYear phone resume')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  res.json({ drive, stageCounts, data: applicants, pagination: paginationMeta(page, limit, total) });
});
