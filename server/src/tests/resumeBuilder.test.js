const request = require('supertest');
const app = require('../app');
const Resume = require('../models/Resume');
const { pdfText } = require('../utils/resumeText');
const { createStudent, createAdmin, bearer } = require('./setup/factories');

const DRAFT = {
  headline: 'Final-year CSE student who builds web apps',
  links: [{ label: 'GitHub', url: 'github.com/asha' }, { label: '', url: '' }],
  summary: 'I build and ship full-stack apps used by 300 students a day.',
  education: [{ institution: 'RV College of Engineering', degree: 'B.E. Computer Science', years: '2023 - 2027', score: 'CGPA 8.4/10' }],
  experience: [{ title: 'Backend Intern', org: 'Acme Fintech', dates: 'May - Jul 2026', bullets: ['Built Spring Boot APIs serving 2,000 requests a minute', ''] }],
  projects: [{ name: 'Campus canteen app', tech: 'React, Flask, Docker', link: '', bullets: ['Cut lunch queues by taking 300 orders a day online (₹ payments via UPI)'] }],
  skills: ['Java', 'React', 'SQL', 'Java'],
  achievements: ['Smart India Hackathon 2025 finalist'],
  certifications: [],
};

describe('resume builder', () => {
  it('starts from the profile when nothing is saved', async () => {
    const student = await createStudent({ branch: 'CSE', graduationYear: 2027, cgpa: 8.4, skills: ['Java', 'SQL'], college: 'RV College of Engineering' });
    const res = await request(app).get('/api/resume-builder').set(bearer(student));

    expect(res.body.updatedAt).toBeNull();
    expect(res.body.data).toMatchObject({
      headline: 'Computer Science student, graduating 2027',
      education: [{ institution: 'RV College of Engineering', years: '2023 - 2027', score: 'CGPA 8.4/10' }],
      skills: ['Java', 'SQL'],
      projects: [],
    });
  });

  it('saves a cleaned draft and renders it as a text PDF', async () => {
    const student = await createStudent({ name: 'Asha Rao', phone: '9876543210' });
    const saved = await request(app).put('/api/resume-builder').set(bearer(student)).send(DRAFT);

    expect(saved.status).toBe(200);
    expect(saved.body.data.links).toEqual([{ label: 'GitHub', url: 'github.com/asha' }]);
    expect(saved.body.data.experience[0].bullets).toEqual(['Built Spring Boot APIs serving 2,000 requests a minute']);
    expect(saved.body.data.skills).toEqual(['Java', 'React', 'SQL']);

    const pdf = await request(app).get('/api/resume-builder/pdf').set(bearer(student)).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.headers['content-disposition']).toContain('Asha_Rao_Resume.pdf');
    const text = await pdfText(pdf.body);
    for (const expected of ['Asha Rao', '9876543210', 'EDUCATION', 'Campus canteen app', 'Rs. payments via UPI', 'Smart India Hackathon']) {
      expect(text).toContain(expected);
    }
  });

  it('makes the draft the student\'s resume, readable by the coach', async () => {
    const student = await createStudent({ name: 'Asha Rao' });
    await request(app).put('/api/resume-builder').set(bearer(student)).send(DRAFT);

    const res = await request(app).post('/api/resume-builder/use').set(bearer(student));
    expect(res.body.user.resume).toMatchObject({ fileName: 'Asha_Rao_Resume.pdf', mimeType: 'application/pdf' });
    const stored = await Resume.findOne({ student: student._id });
    expect(await pdfText(stored.data)).toContain('Backend Intern');
  });

  it('validates and is for students only', async () => {
    const student = await createStudent();
    const res = await request(app).put('/api/resume-builder').set(bearer(student)).send({ ...DRAFT, summary: 'x'.repeat(700) });
    expect(res.status).toBe(400);
    expect((await request(app).get('/api/resume-builder').set(bearer(await createAdmin()))).status).toBe(403);
  });
});
