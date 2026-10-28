const request = require('supertest');
const { unzipSync, strFromU8 } = require('fflate');
const app = require('../app');
const { createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

const PDF = Buffer.from('%PDF-1.7\n%%EOF\n', 'latin1');
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const readBody = (r, cb) => {
  const chunks = [];
  r.on('data', (c) => chunks.push(c));
  r.on('end', () => cb(null, Buffer.concat(chunks)));
};

const uploadAs = (student, file, type) =>
  request(app).put('/api/auth/me/resume').set(bearer(student)).set('Content-Type', type).send(file);

const zipFor = (user, drive, body = {}) =>
  request(app).post(`/api/drives/${drive._id}/applicants/resumes`).set(bearer(user)).send(body).buffer(true).parse(readBody);

async function setup() {
  const admin = await createAdmin();
  const drive = await createDrive(admin, { companyName: 'Infosys', role: 'Systems Engineer' });
  const [asha, rohan, priya] = await Promise.all([
    createStudent({ name: 'Asha Rao', rollNumber: '21CS045' }),
    createStudent({ name: 'Rohan Mehta', rollNumber: '21CS012' }),
    createStudent({ name: 'Priya Nair', rollNumber: '21IS033' }),
  ]);
  const apps = await Promise.all([
    createApplication(asha, drive, { stage: 'interview' }),
    createApplication(rohan, drive, { stage: 'aptitude' }),
    createApplication(priya, drive, { stage: 'interview' }),
  ]);
  await uploadAs(asha, PDF, 'application/pdf');
  await uploadAs(rohan, JPG, 'image/jpeg');
  return { admin, drive, apps, students: { asha, rohan, priya } };
}

describe('POST /api/drives/:id/applicants/resumes', () => {
  it("zips every applicant's resume, named by roll number, and lists who has none", async () => {
    const { admin, drive } = await setup();
    const res = await zipFor(admin, drive);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toBe('attachment; filename="Infosys_Systems_Engineer_resumes.zip"');
    expect(res.headers['x-resume-count']).toBe('2');
    expect(res.headers['x-missing-resume-count']).toBe('1');

    const files = unzipSync(new Uint8Array(res.body));
    expect(Object.keys(files).sort()).toEqual(['21CS012_Rohan_Mehta.jpg', '21CS045_Asha_Rao.pdf', 'no-resume.txt']);
    expect(Buffer.from(files['21CS045_Asha_Rao.pdf']).equals(PDF)).toBe(true);
    expect(strFromU8(files['no-resume.txt'])).toContain('21IS033\tPriya Nair');
  });

  it('can zip only one stage', async () => {
    const { admin, drive } = await setup();
    const res = await zipFor(admin, drive, { stage: 'interview' });

    expect(Object.keys(unzipSync(new Uint8Array(res.body))).sort()).toEqual(['21CS045_Asha_Rao.pdf', 'no-resume.txt']);
  });

  it('can zip only ticked applications', async () => {
    const { admin, drive, apps } = await setup();
    const res = await zipFor(admin, drive, { applicationIds: [String(apps[1]._id)] });

    expect(Object.keys(unzipSync(new Uint8Array(res.body)))).toEqual(['21CS012_Rohan_Mehta.jpg']);
    expect(res.headers['x-missing-resume-count']).toBe('0');
  });

  it('returns 404 when nobody picked has a resume', async () => {
    const { admin, drive, apps } = await setup();
    const res = await request(app)
      .post(`/api/drives/${drive._id}/applicants/resumes`)
      .set(bearer(admin))
      .send({ applicationIds: [String(apps[2]._id)] });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('None of these applicants have uploaded a resume');
  });

  it('rejects ids and stage together, and is admin-only', async () => {
    const { admin, drive, apps, students } = await setup();
    const both = await request(app)
      .post(`/api/drives/${drive._id}/applicants/resumes`)
      .set(bearer(admin))
      .send({ stage: 'interview', applicationIds: [String(apps[0]._id)] });
    const asStudent = await request(app).post(`/api/drives/${drive._id}/applicants/resumes`).set(bearer(students.asha)).send({});

    expect(both.status).toBe(400);
    expect(asStudent.status).toBe(403);
  });
});
