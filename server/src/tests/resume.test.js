const request = require('supertest');
const app = require('../app');
const Resume = require('../models/Resume');
const { RESUME_MAX_BYTES } = require('../utils/resume');
const { createStudent, createAdmin, bearer } = require('./setup/factories');

const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n', 'latin1');
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

const upload = (user, file, { name = 'Asha Rao Resume.pdf', type = 'application/pdf' } = {}) =>
  request(app).put('/api/auth/me/resume').query({ name }).set(bearer(user)).set('Content-Type', type).send(file);

describe('PUT /api/auth/me/resume', () => {
  it('stores a PDF and returns the user with resume details', async () => {
    const student = await createStudent();
    const res = await upload(student, PDF);

    expect(res.status).toBe(200);
    expect(res.body.user.resume).toMatchObject({
      fileName: 'Asha Rao Resume.pdf',
      mimeType: 'application/pdf',
      size: PDF.length,
      uploadedAt: expect.any(String),
    });
    expect(await Resume.countDocuments({ student: student._id })).toBe(1);
  });

  it('accepts a JPG and names it after the detected type', async () => {
    const student = await createStudent();
    const res = await upload(student, JPG, { name: 'scan.jpeg', type: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.user.resume).toMatchObject({ fileName: 'scan.jpg', mimeType: 'image/jpeg' });
  });

  it('replaces the previous resume instead of adding another', async () => {
    const student = await createStudent();
    await upload(student, PDF);
    const res = await upload(student, JPG, { name: 'new.jpg', type: 'image/jpeg' });

    expect(res.body.user.resume.fileName).toBe('new.jpg');
    expect(await Resume.countDocuments({ student: student._id })).toBe(1);
  });

  it('rejects a file that is not really a PDF or JPG, whatever its name says', async () => {
    const student = await createStudent();
    const res = await upload(student, Buffer.from('MZ fake executable'), { name: 'resume.pdf' });

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(await Resume.countDocuments()).toBe(0);
  });

  it('rejects an empty upload', async () => {
    const student = await createStudent();
    const res = await request(app).put('/api/auth/me/resume').set(bearer(student));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects files over the size limit with 413', async () => {
    const student = await createStudent();
    const big = Buffer.concat([PDF, Buffer.alloc(RESUME_MAX_BYTES)]);
    const res = await upload(student, big);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('strips unsafe characters from the file name', async () => {
    const student = await createStudent();
    const res = await upload(student, PDF, { name: '../../"evil"<script>.pdf' });
    expect(res.body.user.resume.fileName).toBe('evilscript.pdf');
  });

  it('is for students only', async () => {
    const admin = await createAdmin();
    const res = await upload(admin, PDF);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me/resume', () => {
  it('returns the stored file with its type and name', async () => {
    const student = await createStudent();
    await upload(student, PDF, { name: 'cv.pdf' });

    const res = await request(app).get('/api/auth/me/resume').set(bearer(student)).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('inline; filename="cv.pdf"');
    expect(res.body.equals(PDF)).toBe(true);
  });

  it("only returns the student's own resume", async () => {
    const owner = await createStudent();
    const other = await createStudent();
    await upload(owner, PDF);

    const res = await request(app).get('/api/auth/me/resume').set(bearer(other));
    expect(res.status).toBe(404);
  });

  it('returns 404 when nothing has been uploaded', async () => {
    const student = await createStudent();
    const res = await request(app).get('/api/auth/me/resume').set(bearer(student));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /api/auth/me/resume', () => {
  it('removes the file and the resume details', async () => {
    const student = await createStudent();
    await upload(student, PDF);

    const res = await request(app).delete('/api/auth/me/resume').set(bearer(student));
    expect(res.status).toBe(200);
    expect(res.body.user.resume).toBeUndefined();
    expect(await Resume.countDocuments()).toBe(0);
  });
});
