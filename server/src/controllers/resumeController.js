const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { detectResumeType, resumeFileName } = require('../utils/resume');
const Resume = require('../models/Resume');
const User = require('../models/User');

async function sendResume(res, student, missingMessage) {
  const resume = student?.resume && (await Resume.findOne({ student: student._id }));
  if (!resume) throw new ApiError(404, 'NOT_FOUND', missingMessage);

  res.set({
    'Content-Type': student.resume.mimeType,
    'Content-Disposition': `inline; filename="${student.resume.fileName}"`,
  });
  res.send(resume.data);
}

exports.uploadResume = asyncHandler(async (req, res) => {
  const file = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!file.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Choose a file to upload');

  const mimeType = detectResumeType(file);
  if (!mimeType) throw new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Upload your resume as a PDF or JPG file');

  await Resume.findOneAndUpdate({ student: req.user._id }, { data: file }, { upsert: true, setDefaultsOnInsert: true });
  req.user.resume = {
    fileName: resumeFileName(req.query.name, mimeType),
    mimeType,
    size: file.length,
    uploadedAt: new Date(),
  };
  await req.user.save();
  res.json({ user: req.user });
});

exports.downloadResume = asyncHandler(async (req, res) => {
  await sendResume(res, req.user, "You haven't uploaded a resume yet");
});

// Officer view of any student's resume.
exports.downloadStudentResume = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('resume').lean();
  await sendResume(res, student, "This student hasn't uploaded a resume");
});

exports.deleteResume = asyncHandler(async (req, res) => {
  await Resume.deleteOne({ student: req.user._id });
  req.user.resume = undefined;
  await req.user.save();
  res.json({ user: req.user });
});
