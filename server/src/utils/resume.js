// Resume upload rules (api-contract.md 3.19).
const RESUME_MAX_BYTES = 2 * 1024 * 1024;

const EXTENSIONS = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg' };

// Detects the type from the file's first bytes, so a renamed file can't pass as a PDF or JPG.
function detectResumeType(buffer) {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  return null;
}

// Keeps a readable name from the student's file, with the extension matching the detected type.
function resumeFileName(original, mimeType) {
  const base = String(original || '')
    .replace(/\.[^.]*$/, '')
    .replace(/[^\w\- ().]/g, '')
    .replace(/^[.\s]+/, '')
    .trim()
    .slice(0, 100);
  return `${base || 'resume'}.${EXTENSIONS[mimeType]}`;
}

module.exports = { RESUME_MAX_BYTES, detectResumeType, resumeFileName };
