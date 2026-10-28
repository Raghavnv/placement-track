const asyncHandler = require('../utils/asyncHandler');
const { resumePdf } = require('../utils/resumePdf');
const { draft: draftSchema } = require('../validators/resumeBuilderSchemas');
const ResumeDraft = require('../models/ResumeDraft');
const Resume = require('../models/Resume');
const { BRANCH_NAMES } = require('../utils/constants');

// A first draft from the profile, so students don't start from a blank page.
function starterDraft(student) {
  return draftSchema.parse({
    headline: `${BRANCH_NAMES[student.branch] || student.branch} student, graduating ${student.graduationYear}`,
    education: [
      {
        institution: student.college || '',
        degree: `B.E. / B.Tech, ${BRANCH_NAMES[student.branch] || student.branch}`,
        years: `${student.graduationYear - 4} - ${student.graduationYear}`,
        score: student.cgpa ? `CGPA ${student.cgpa}/10` : '',
      },
    ],
    skills: student.skills || [],
  });
}

const fileName = (name) => `${String(name).replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'Resume'}_Resume.pdf`;

async function savedDraft(student) {
  const saved = await ResumeDraft.findOne({ student: student._id }).lean();
  return saved ? { data: saved.data, updatedAt: saved.updatedAt } : { data: starterDraft(student), updatedAt: null };
}

exports.getDraft = asyncHandler(async (req, res) => {
  res.json(await savedDraft(req.user));
});

exports.saveDraft = asyncHandler(async (req, res) => {
  const saved = await ResumeDraft.findOneAndUpdate({ student: req.user._id }, { data: req.body }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  res.json({ data: saved.data, updatedAt: saved.updatedAt });
});

// The saved draft as a PDF download.
exports.downloadPdf = asyncHandler(async (req, res) => {
  const { data } = await savedDraft(req.user);
  const pdf = await resumePdf(req.user, data);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fileName(req.user.name)}"` });
  res.send(pdf);
});

// Makes the saved draft the student's resume: officers see it and the Resume Coach can review it.
exports.useAsResume = asyncHandler(async (req, res) => {
  const { data } = await savedDraft(req.user);
  const pdf = await resumePdf(req.user, data);
  await Resume.findOneAndUpdate({ student: req.user._id }, { data: pdf }, { upsert: true, setDefaultsOnInsert: true });
  req.user.resume = { fileName: fileName(req.user.name), mimeType: 'application/pdf', size: pdf.length, uploadedAt: new Date() };
  await req.user.save();
  res.json({ user: req.user });
});
