const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { containsRegex, paginationMeta } = require('../utils/query');
const Experience = require('../models/Experience');
const Application = require('../models/Application');
const Drive = require('../models/Drive');

const { companyKey } = Experience;

// Who wrote it, as readers see it. Officers always see the name (for moderation).
function present(exp, viewer) {
  const { author, ...rest } = exp;
  const isAdmin = viewer.role === 'admin';
  const mine = author?._id?.equals(viewer._id) || false;
  const showName = !exp.anonymous || isAdmin || mine;
  return {
    ...rest,
    mine,
    author: author && {
      name: showName ? author.name : 'Anonymous student',
      branch: author.branch,
      graduationYear: author.graduationYear,
    },
  };
}

exports.listExperiences = asyncHandler(async (req, res) => {
  const { company, search, page, limit } = req.query;
  const filter = {};
  if (company) filter.companyKey = companyKey(company);
  if (search) filter.$or = [{ companyName: containsRegex(search) }, { role: containsRegex(search) }];

  const [total, rows] = await Promise.all([
    Experience.countDocuments(filter),
    Experience.find(filter)
      .select('-__v -companyKey')
      .populate('author', 'name branch graduationYear')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);
  res.json({ data: rows.map((e) => present(e, req.user)), pagination: paginationMeta(page, limit, total) });
});

// Companies with experiences, most written-about first (for browse chips).
exports.listCompanies = asyncHandler(async (req, res) => {
  const rows = await Experience.aggregate([
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$companyKey', companyName: { $first: '$companyName' }, count: { $sum: 1 } } },
    { $sort: { count: -1, companyName: 1 } },
    { $limit: 30 },
    { $project: { _id: 0, companyName: 1, count: 1 } },
  ]);
  res.json({ data: rows });
});

exports.createExperience = asyncHandler(async (req, res) => {
  const { driveId, ...body } = req.body;
  if (driveId) {
    const drive = await Drive.findById(driveId).select('_id').lean();
    if (!drive) throw new ApiError(404, 'NOT_FOUND', 'Drive not found');
    // Linking a write-up to a drive is only for students who took part in it.
    if (!(await Application.exists({ student: req.user._id, drive: driveId }))) {
      throw new ApiError(403, 'FORBIDDEN', 'You can only link an experience to a drive you applied to');
    }
  }
  const experience = await Experience.create({ ...body, drive: driveId || null, author: req.user._id });
  await experience.populate('author', 'name branch graduationYear');
  const { companyKey: _key, __v, ...plain } = experience.toObject();
  res.status(201).json({ experience: present(plain, req.user) });
});

exports.deleteExperience = asyncHandler(async (req, res) => {
  const experience = await Experience.findById(req.params.id);
  if (!experience) throw new ApiError(404, 'NOT_FOUND', 'Experience not found');
  if (req.user.role !== 'admin' && !experience.author.equals(req.user._id)) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only delete your own experiences');
  }
  await experience.deleteOne();
  res.json({ message: 'Experience deleted' });
});
