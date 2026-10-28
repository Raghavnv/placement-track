const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { paginationMeta } = require('../utils/query');
const Announcement = require('../models/Announcement');
const Application = require('../models/Application');
const Drive = require('../models/Drive');
const User = require('../models/User');
const { notify } = require('../utils/notify');

const DRIVE_FIELDS = 'companyName role';

// How many students can currently see an announcement.
function audienceCount({ drive, stages }) {
  if (!drive) return User.countDocuments({ role: 'student' });
  return Application.countDocuments({ drive: drive._id || drive, ...(stages.length ? { stage: { $in: stages } } : {}) });
}

// The students who can see an announcement right now (for notifications).
function audienceIds({ drive, stages }) {
  if (!drive) return User.find({ role: 'student' }).distinct('_id');
  return Application.find({ drive: drive._id || drive, ...(stages.length ? { stage: { $in: stages } } : {}) }).distinct('student');
}

// A student sees announcements for everyone, plus those for drives they applied to
// (only when their current stage is one of the announcement's stages, if it names any).
async function studentFilter(studentId) {
  const applications = await Application.find({ student: studentId }).select('drive stage').lean();
  return {
    $or: [
      { drive: null },
      ...applications.map((a) => ({ drive: a.drive, $or: [{ stages: { $size: 0 } }, { stages: a.stage }] })),
    ],
  };
}

exports.listAnnouncements = asyncHandler(async (req, res) => {
  const { drive, page, limit } = req.query;
  const isAdmin = req.user.role === 'admin';

  const filter = isAdmin ? {} : await studentFilter(req.user._id);
  if (drive) filter.drive = drive;

  const [total, announcements] = await Promise.all([
    Announcement.countDocuments(filter),
    Announcement.find(filter)
      .select(isAdmin ? '-__v' : '-__v -createdBy')
      .populate('drive', DRIVE_FIELDS)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const data = isAdmin
    ? await Promise.all(announcements.map(async (a) => ({ ...a, audienceCount: await audienceCount(a) })))
    : announcements;

  res.json({ data, pagination: paginationMeta(page, limit, total) });
});

exports.createAnnouncement = asyncHandler(async (req, res) => {
  if (req.body.drive && !(await Drive.exists({ _id: req.body.drive }))) {
    throw new ApiError(404, 'NOT_FOUND', 'Drive not found');
  }

  const announcement = await Announcement.create({ ...req.body, createdBy: req.user._id });
  await announcement.populate('drive', DRIVE_FIELDS);
  const { drive } = announcement;
  await notify(await audienceIds(announcement), {
    type: 'announcement',
    title: drive ? `${drive.companyName}: ${announcement.title}` : announcement.title,
    body: announcement.message.slice(0, 500),
    link: drive ? `/student/drives/${drive._id}` : '/student',
  });
  res.status(201).json({ announcement: { ...announcement.toJSON(), audienceCount: await audienceCount(announcement) } });
});

exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);
  if (!announcement) throw new ApiError(404, 'NOT_FOUND', 'Announcement not found');
  res.json({ message: 'Announcement deleted' });
});
