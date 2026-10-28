const { extractText, getDocumentProxy } = require('unpdf');
const ApiError = require('./ApiError');
const { detectResumeType } = require('./resume');
const Resume = require('../models/Resume');

// A one or two page resume is 2-8k characters. Anything far longer isn't a resume,
// and would only burn the AI provider's token limits.
const MAX_CHARS = 15000;
const MIN_CHARS = 200;

// Text of a PDF (empty string if it has none or can't be read), whitespace tidied.
async function pdfText(buffer) {
  let text = '';
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    ({ text } = await extractText(pdf, { mergePages: true }));
  } catch (error) {
    console.error(`PDF text extraction failed: ${error.message}`);
  }
  return String(text || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// Plain text of the student's uploaded resume, for the AI coach (it reads text, not files).
async function resumeText(studentId) {
  const resume = await Resume.findOne({ student: studentId });
  if (!resume) throw new ApiError(404, 'NO_RESUME', 'Upload your resume first, then ask the coach.');

  if (detectResumeType(resume.data) !== 'application/pdf') {
    throw new ApiError(422, 'RESUME_NOT_PDF', 'The coach reads PDF resumes. Upload your resume as a PDF (not a photo) to get feedback.');
  }

  const clean = await pdfText(resume.data);
  if (clean.length < MIN_CHARS) {
    throw new ApiError(422, 'RESUME_UNREADABLE', "We couldn't read the text in your resume. It may be a scanned image. Export it from Word or Google Docs as a PDF and upload that.");
  }
  return { text: clean.slice(0, MAX_CHARS), truncated: clean.length > MAX_CHARS };
}

module.exports = { resumeText, pdfText };
