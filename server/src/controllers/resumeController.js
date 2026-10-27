const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { detectResumeType, resumeFileName } = require('../utils/resume');
const Resume = require('../models/Resume');

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
  const resume = req.user.resume && (await Resume.findOne({ student: req.user._id }));
  if (!resume) throw new ApiError(404, 'NOT_FOUND', "You haven't uploaded a resume yet");

  res.set({
    'Content-Type': req.user.resume.mimeType,
    'Content-Disposition': `inline; filename="${req.user.resume.fileName}"`,
  });
  res.send(resume.data);
});

exports.deleteResume = asyncHandler(async (req, res) => {
  await Resume.deleteOne({ student: req.user._id });
  req.user.resume = undefined;
  await req.user.save();
  res.json({ user: req.user });
});
