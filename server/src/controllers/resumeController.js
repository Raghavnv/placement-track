const { Zip, ZipPassThrough } = require('fflate');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { detectResumeType, resumeFileName } = require('../utils/resume');
const Resume = require('../models/Resume');
const User = require('../models/User');
const Application = require('../models/Application');
const Drive = require('../models/Drive');

const EXTENSIONS = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg' };
const slug = (text) => text.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');

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

// One ZIP of a drive's applicants' resumes, named "<roll>_<name>.pdf", for sending to the company.
// Picks the ticked applications, everyone at a stage, or every applicant. Files are streamed one at a
// time from MongoDB so memory stays low on a small server.
exports.downloadDriveResumes = asyncHandler(async (req, res) => {
  const { applicationIds, stage } = req.body;
  const drive = await Drive.findById(req.params.id).select('companyName role').lean();
  if (!drive) throw new ApiError(404, 'NOT_FOUND', 'Drive not found');

  const match = { drive: drive._id };
  if (applicationIds) match._id = { $in: applicationIds };
  else if (stage) match.stage = stage;
  const applications = await Application.find(match).select('student').populate('student', 'name rollNumber resume').lean();

  const students = applications.map((a) => a.student).filter(Boolean);
  const withResume = students.filter((s) => s.resume);
  const missing = students.filter((s) => !s.resume);
  if (!withResume.length) {
    throw new ApiError(404, 'NOT_FOUND', students.length ? 'None of these applicants have uploaded a resume' : 'No applicants to download');
  }

  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${slug(`${drive.companyName} ${drive.role}`)}_resumes.zip"`,
    'X-Resume-Count': String(withResume.length),
    'X-Missing-Resume-Count': String(missing.length),
  });

  const zip = new Zip((err, chunk, final) => {
    if (err) {
      res.destroy(err);
      return;
    }
    res.write(Buffer.from(chunk));
    if (final) res.end();
  });
  const addFile = (name, data) => {
    const file = new ZipPassThrough(name); // PDFs and JPGs are already compressed
    zip.add(file);
    file.push(data, true);
  };

  const byId = new Map(withResume.map((s) => [s._id.toString(), s]));
  for await (const resume of Resume.find({ student: { $in: [...byId.keys()] } }).cursor()) {
    const student = byId.get(resume.student.toString());
    addFile(`${student.rollNumber}_${slug(student.name)}.${EXTENSIONS[student.resume.mimeType]}`, resume.data);
  }
  if (missing.length) {
    const lines = missing.map((s) => `${s.rollNumber}\t${s.name}`).join('\r\n');
    addFile('no-resume.txt', Buffer.from(`No resume uploaded yet (${missing.length}):\r\n${lines}\r\n`));
  }
  zip.end();
});

exports.deleteResume = asyncHandler(async (req, res) => {
  await Resume.deleteOne({ student: req.user._id });
  req.user.resume = undefined;
  await req.user.save();
  res.json({ user: req.user });
});
