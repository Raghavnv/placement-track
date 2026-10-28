const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { canTransition, emptyStageCounts, stageNotice, STAGE_LABELS, TRANSITIONS } = require('../utils/stages');
const { notify } = require('../utils/notify');
const { eligibilityFilter } = require('../utils/eligibility');
const { placementFor } = require('../utils/placement');
const { buildCalendar } = require('../utils/ics');
const { DRIVE_SUMMARY_FIELDS } = require('../utils/constants');
const Application = require('../models/Application');
const Drive = require('../models/Drive');
const User = require('../models/User');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const STUDENT_SUMMARY_FIELDS = 'name email rollNumber branch cgpa backlogs graduationYear phone resume';

const notFound = () => new ApiError(404, 'NOT_FOUND', 'Application not found');

const withoutNotes = (application) => {
  const { notes, ...rest } = application.toJSON ? application.toJSON() : application;
  return rest;
};

exports.myApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ student: req.user._id })
    .select('-__v')
    .populate('drive', DRIVE_SUMMARY_FIELDS)
    .sort({ updatedAt: -1 })
    .lean();

  const countsByStage = emptyStageCounts();
  applications.forEach((a) => { countsByStage[a.stage] += 1; });

  res.json({ data: applications, countsByStage });
});

exports.getApplication = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const query = Application.findById(req.params.id).select('-__v').populate('drive', DRIVE_SUMMARY_FIELDS);
  if (isAdmin) query.populate('student', STUDENT_SUMMARY_FIELDS);
  const application = await query.lean();

  // A student asking for someone else's application gets 404, so IDs reveal nothing.
  if (!application || (!isAdmin && !application.student.equals(req.user._id))) throw notFound();

  res.json({ application: isAdmin ? withoutNotes(application) : application });
});

exports.updateStage = asyncHandler(async (req, res) => {
  const { stage, remark } = req.body;
  const application = await Application.findById(req.params.id);
  if (!application) throw notFound();

  if (!canTransition(application.stage, stage)) {
    const next = TRANSITIONS[application.stage];
    throw new ApiError(
      400,
      'INVALID_STAGE_TRANSITION',
      `Cannot move from ${STAGE_LABELS[application.stage]} to ${STAGE_LABELS[stage]}`,
      [{
        field: 'stage',
        message: next.length
          ? `Allowed next stages: ${next.map((s) => STAGE_LABELS[s]).join(', ')}`
          : `${STAGE_LABELS[application.stage]} is a final stage`,
      }],
    );
  }

  application.stage = stage;
  application.stageHistory.push({ stage, remark, changedBy: req.user._id });
  await application.save();
  await application.populate([
    { path: 'drive', select: DRIVE_SUMMARY_FIELDS },
    { path: 'student', select: STUDENT_SUMMARY_FIELDS },
  ]);
  await notify([application.student._id], stageNotice(stage, application.drive, remark));

  res.json({ application: withoutNotes(application) });
});

function skipReason(current, target) {
  if (current === target) return `Already at ${STAGE_LABELS[target]}`;
  if (!TRANSITIONS[current].length) return `${STAGE_LABELS[current]} is a final stage`;
  return `Can't move from ${STAGE_LABELS[current]} to ${STAGE_LABELS[target]}`;
}

exports.bulkUpdateStage = asyncHandler(async (req, res) => {
  const { stage, remark, applicationIds, rollNumbers } = req.body;
  const drive = await Drive.findById(req.params.id).select('companyName role').lean();
  if (!drive) throw new ApiError(404, 'NOT_FOUND', 'Drive not found');

  const match = { drive: req.params.id };
  if (applicationIds) match._id = { $in: applicationIds };
  else match.student = { $in: await User.find({ role: 'student', rollNumber: { $in: rollNumbers } }).distinct('_id') };

  const applications = await Application.find(match).select('stage student').populate('student', 'name rollNumber').lean();

  const found = new Set(applications.map((a) => (applicationIds ? a._id.toString() : a.student.rollNumber)));
  const notFound = (applicationIds || rollNumbers).filter((key) => !found.has(key));

  const fromStages = Object.keys(TRANSITIONS).filter((from) => canTransition(from, stage));
  const movable = applications.filter((a) => fromStages.includes(a.stage));
  const skipped = applications
    .filter((a) => !fromStages.includes(a.stage))
    .map((a) => ({
      applicationId: a._id,
      name: a.student.name,
      rollNumber: a.student.rollNumber,
      stage: a.stage,
      reason: skipReason(a.stage, stage),
    }));

  // The stage condition is repeated in the update so a concurrent move can't be applied twice.
  const { modifiedCount } = movable.length
    ? await Application.updateMany(
      { _id: { $in: movable.map((a) => a._id) }, stage: { $in: fromStages } },
      { $set: { stage }, $push: { stageHistory: { stage, remark, changedBy: req.user._id, changedAt: new Date() } } },
    )
    : { modifiedCount: 0 };
  if (modifiedCount) await notify(movable.map((a) => a.student._id), stageNotice(stage, drive, remark));

  res.json({ stage, moved: modifiedCount, skipped, notFound });
});

exports.updateNotes = asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, student: req.user._id });
  if (!application) throw notFound();

  application.notes = req.body.notes;
  await application.save();
  await application.populate('drive', DRIVE_SUMMARY_FIELDS);

  res.json({ application });
});

// Eligible open drives the student hasn't applied to, and drive days of active applications.
async function upcomingFor(student, until) {
  const now = new Date();
  const [appliedDriveIds, placement] = await Promise.all([
    Application.find({ student: student._id }).distinct('drive'),
    placementFor(student),
  ]);

  const [deadlineDrives, activeApplications] = await Promise.all([
    Drive.find({
      status: 'open',
      deadline: { $gte: now, $lte: until },
      _id: { $nin: appliedDriveIds },
      ...eligibilityFilter(student, placement),
    })
      .select('companyName role location deadline')
      .sort({ deadline: 1 })
      .lean(),
    Application.find({ student: student._id, stage: { $nin: ['rejected', 'offer'] } })
      .populate({ path: 'drive', select: 'companyName role location driveDate', match: { driveDate: { $gte: now, $lte: until } } })
      .lean(),
  ]);

  const deadlines = deadlineDrives.map((d) => ({
    driveId: d._id,
    companyName: d.companyName,
    role: d.role,
    location: d.location,
    deadline: d.deadline,
    hoursLeft: Math.floor((d.deadline - now) / HOUR),
  }));

  const upcomingDrives = activeApplications
    .filter((a) => a.drive)
    .map((a) => ({
      applicationId: a._id,
      driveId: a.drive._id,
      companyName: a.drive.companyName,
      role: a.drive.role,
      location: a.drive.location,
      driveDate: a.drive.driveDate,
      stage: a.stage,
    }))
    .sort((a, b) => a.driveDate - b.driveDate);

  return { deadlines, upcomingDrives };
}

exports.reminders = asyncHandler(async (req, res) => {
  const { days } = req.query;
  const { deadlines, upcomingDrives } = await upcomingFor(req.user, new Date(Date.now() + days * DAY));
  // `location` is only used by the calendar export.
  res.json({
    deadlines: deadlines.map(({ location, ...d }) => d),
    upcomingDrives: upcomingDrives.map(({ location, ...d }) => d),
  });
});

exports.calendar = asyncHandler(async (req, res) => {
  const { deadlines, upcomingDrives } = await upcomingFor(req.user, new Date(Date.now() + 365 * DAY));

  const events = [
    ...deadlines.map((d) => ({
      uid: `deadline-${d.driveId}@placementtrack`,
      start: new Date(d.deadline.getTime() - HOUR),
      end: d.deadline,
      summary: `Apply: ${d.companyName} – ${d.role} (deadline)`,
      description: `Application deadline for ${d.companyName} ${d.role}. Apply on PlacementTrack before it closes.`,
      alarm: '-P1D',
    })),
    ...upcomingDrives.map((d) => ({
      uid: `drive-${d.applicationId}@placementtrack`,
      start: d.driveDate,
      end: new Date(d.driveDate.getTime() + 3 * HOUR),
      summary: `${d.companyName} drive – ${STAGE_LABELS[d.stage]}`,
      description: `${d.companyName} ${d.role}. Current stage: ${STAGE_LABELS[d.stage]}. Check your prep notes on PlacementTrack.`,
      location: d.location,
      alarm: '-PT12H',
    })),
  ];

  res
    .set('Content-Type', 'text/calendar; charset=utf-8')
    .set('Content-Disposition', 'attachment; filename="placementtrack.ics"')
    .send(buildCalendar(events, { name: 'PlacementTrack deadlines' }));
});
