const PDFDocument = require('pdfkit');

// One-column, text-only A4 resume: what applicant tracking systems (and the Resume Coach) read best.
// Uses the PDF standard fonts, so characters outside Windows-1252 are swapped for plain ones.
const PAGE = { size: 'A4', margins: { top: 42, bottom: 42, left: 50, right: 50 } };
const INK = '#101828';
const MUTED = '#475467';
const RULE = '#d0d5dd';

const safe = (text) =>
  String(text || '')
    .replace(/₹/g, 'Rs. ')
    .replace(/[‐-―−]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF‘’“”•…–—€]/g, '')
    .trim();

function renderResume(doc, { name, email, phone }, d) {
  const width = doc.page.width - PAGE.margins.left - PAGE.margins.right;

  doc.font('Helvetica-Bold').fontSize(20).fillColor(INK).text(safe(name));
  if (d.headline) doc.moveDown(0.15).font('Helvetica').fontSize(10.5).fillColor(MUTED).text(safe(d.headline));
  const contact = [email, phone, ...d.links.map((l) => (l.label ? `${l.label}: ${l.url}` : l.url))].filter(Boolean).map(safe);
  doc.moveDown(0.25).font('Helvetica').fontSize(9.5).fillColor(MUTED).text(contact.join('  |  '));

  const section = (title) => {
    doc.moveDown(0.8).font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(title.toUpperCase(), { characterSpacing: 0.6 });
    const y = doc.y + 2;
    doc.moveTo(PAGE.margins.left, y).lineTo(PAGE.margins.left + width, y).lineWidth(0.6).strokeColor(RULE).stroke();
    doc.moveDown(0.45);
  };
  // "Title — Org" on the left, dates on the right, on one line.
  const entry = (left, right) => {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(safe(left), PAGE.margins.left, y, { width: width - 120 });
    const afterLeft = doc.y;
    if (right) doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(safe(right), PAGE.margins.left + width - 120, y, { width: 120, align: 'right' });
    doc.y = Math.max(afterLeft, doc.y);
    doc.x = PAGE.margins.left;
  };
  const sub = (text) => text && doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(MUTED).text(safe(text));
  const bulletList = (items) =>
    items.forEach((b) => {
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(`•  ${safe(b)}`, PAGE.margins.left + 8, doc.y, { width: width - 8, indent: 0, paragraphGap: 1.5 });
      doc.x = PAGE.margins.left;
    });

  if (d.summary) {
    section('Summary');
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(safe(d.summary), { lineGap: 1.5 });
  }
  if (d.education.length) {
    section('Education');
    d.education.forEach((e, i) => {
      if (i) doc.moveDown(0.35);
      entry(e.institution, e.years);
      sub([e.degree, e.score].filter(Boolean).join('  |  '));
    });
  }
  if (d.skills.length) {
    section('Skills');
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(d.skills.map(safe).join(', '));
  }
  if (d.experience.length) {
    section('Experience');
    d.experience.forEach((e, i) => {
      if (i) doc.moveDown(0.45);
      entry([e.title, e.org].filter(Boolean).join(', '), e.dates);
      bulletList(e.bullets);
    });
  }
  if (d.projects.length) {
    section('Projects');
    d.projects.forEach((p, i) => {
      if (i) doc.moveDown(0.45);
      entry(p.name, '');
      sub([p.tech, p.link].filter(Boolean).join('  |  '));
      bulletList(p.bullets);
    });
  }
  if (d.achievements.length) {
    section('Achievements');
    bulletList(d.achievements);
  }
  if (d.certifications.length) {
    section('Certifications');
    bulletList(d.certifications);
  }
}

// Resolves to the PDF as a Buffer.
function resumePdf(student, draft) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ ...PAGE, info: { Title: `${safe(student.name)} - Resume`, Author: safe(student.name), Creator: 'PlacementTrack' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    renderResume(doc, student, draft);
    doc.end();
  });
}

module.exports = { resumePdf };
