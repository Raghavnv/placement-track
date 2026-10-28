const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { containsRegex, paginationMeta } = require('../utils/query');
const { DRIVE_SUMMARY_FIELDS } = require('../utils/constants');
const Application = require('../models/Application');
const User = require('../models/User');

const LIST_FIELDS = 'name email rollNumber branch cgpa backlogs graduationYear phone college resume createdAt';
const ACTIVE_STAGES = ['applied', 'aptitude', 'interview'];

const SORTS = {
  rollNumber: { rollNumber: 1 },
  name: { name: 1, _id: 1 },
  '-cgpa': { cgpa: -1, rollNumber: 1 },
  '-createdAt': { createdAt: -1, _id: -1 },
};

// Officer view of every registered student, with how each one is doing this season.
exports.listStudents = asyncHandler(async (req, res) => {
  const { search, branch, graduationYear, minCgpa, status, resume, sort, page, limit } = req.query;

  const base = { role: 'student' };
  if (search) {
    const rx = containsRegex(search);
    base.$or = [{ name: rx }, { rollNumber: rx }, { email: rx }];
  }
  if (branch) base.branch = branch;
  if (graduationYear) base.graduationYear = graduationYear;
  if (minCgpa !== undefined) base.cgpa = { $gte: minCgpa };

  const placedIds = await Application.distinct('student', { stage: 'offer' });
  const filter = { ...base };
  if (status) filter._id = status === 'placed' ? { $in: placedIds } : { $nin: placedIds };
  if (resume) filter.resume = { $exists: resume === 'yes' };

  const [total, students, all, placed, noResume] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).select(LIST_FIELDS).sort(SORTS[sort]).skip((page - 1) * limit).limit(limit).lean(),
    // Counts for the filter tabs ignore the status and resume filters themselves.
    User.countDocuments(base),
    User.countDocuments({ ...base, _id: { $in: placedIds } }),
    User.countDocuments({ ...base, resume: { $exists: false } }),
  ]);

  const rows = await Application.aggregate([
    { $match: { student: { $in: students.map((s) => s._id) } } },
    { $lookup: { from: 'drives', localField: 'drive', foreignField: '_id', as: 'drive' } },
    { $unwind: '$drive' },
    {
      $group: {
        _id: '$student',
        applicationCount: { $sum: 1 },
        activeCount: { $sum: { $cond: [{ $in: ['$stage', ACTIVE_STAGES] }, 1, 0] } },
        offerCount: { $sum: { $cond: [{ $eq: ['$stage', 'offer'] }, 1, 0] } },
        bestOffer: { $max: { $cond: [{ $eq: ['$stage', 'offer'] }, '$drive.package', null] } },
      },
    },
  ]);
  const byStudent = new Map(rows.map(({ _id, ...summary }) => [_id.toString(), summary]));
  const empty = { applicationCount: 0, activeCount: 0, offerCount: 0, bestOffer: null };

  res.json({
    data: students.map((s) => ({ ...s, ...(byStudent.get(s._id.toString()) || empty) })),
    counts: { all, placed, unplaced: all - placed, noResume },
    pagination: paginationMeta(page, limit, total),
  });
});

exports.getStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('-__v').lean();
  if (!student) throw new ApiError(404, 'NOT_FOUND', 'Student not found');

  const applications = await Application.find({ student: student._id })
    .select('-notes -__v') // notes are private to the student
    .populate('drive', DRIVE_SUMMARY_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  res.json({ student, applications });
});
