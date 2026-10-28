const request = require('supertest');
const app = require('../app');
const Announcement = require('../models/Announcement');
const { createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

const post = (admin, body) =>
  request(app)
    .post('/api/announcements')
    .set(bearer(admin))
    .send({ title: 'Aptitude test venue', message: 'Seminar hall, 10 am. Bring your ID card.', ...body });

const titlesFor = async (user, query = {}) => {
  const res = await request(app).get('/api/announcements').query(query).set(bearer(user));
  expect(res.status).toBe(200);
  return res.body.data.map((a) => a.title);
};

describe('POST /api/announcements', () => {
  it('posts to every student and reports the audience size', async () => {
    const admin = await createAdmin();
    await Promise.all([createStudent(), createStudent()]);

    const res = await post(admin, { link: 'https://forms.gle/abc' });

    expect(res.status).toBe(201);
    expect(res.body.announcement).toMatchObject({
      title: 'Aptitude test venue',
      link: 'https://forms.gle/abc',
      drive: null,
      stages: [],
      audienceCount: 2,
    });
  });

  it("posts to one drive's applicants at chosen stages", async () => {
    const admin = await createAdmin();
    const drive = await createDrive(admin, { companyName: 'Infosys' });
    const [a, b, c] = await Promise.all([createStudent(), createStudent(), createStudent()]);
    await Promise.all([
      createApplication(a, drive, { stage: 'interview' }),
      createApplication(b, drive, { stage: 'interview' }),
      createApplication(c, drive, { stage: 'rejected' }),
    ]);

    const res = await post(admin, { drive: drive._id.toString(), stages: ['interview', 'interview'] });

    expect(res.status).toBe(201);
    expect(res.body.announcement).toMatchObject({ drive: { companyName: 'Infosys' }, stages: ['interview'], audienceCount: 2 });
  });

  it('validates title, message, link and stages', async () => {
    const admin = await createAdmin();
    const res = await post(admin, { title: 'Hi', message: '', link: 'javascript:alert(1)', stages: ['interview'] });

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['title', 'message', 'link']));

    const noDrive = await post(admin, { stages: ['interview'] });
    expect(noDrive.status).toBe(400);
    expect(noDrive.body.error.details).toEqual([{ field: 'stages', message: 'Pick a drive to send to applicants at a stage' }]);
  });

  it('returns 404 for an unknown drive', async () => {
    const admin = await createAdmin();
    const res = await post(admin, { drive: '64b000000000000000000000' });
    expect(res.status).toBe(404);
  });

  it('is admin-only', async () => {
    const student = await createStudent();
    const res = await post(student);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/announcements', () => {
  it('shows a student only what is meant for them', async () => {
    const admin = await createAdmin();
    const [infosys, tcs] = await Promise.all([createDrive(admin), createDrive(admin)]);
    const [asha, rohan] = await Promise.all([createStudent(), createStudent()]);
    await Promise.all([
      createApplication(asha, infosys, { stage: 'interview' }),
      createApplication(rohan, infosys, { stage: 'aptitude' }),
    ]);

    await post(admin, { title: 'Welcome to the season' });
    await post(admin, { title: 'Infosys: all applicants', drive: infosys._id.toString() });
    await post(admin, { title: 'Infosys: interview slots', drive: infosys._id.toString(), stages: ['interview'] });
    await post(admin, { title: 'TCS: test link', drive: tcs._id.toString() });

    expect(await titlesFor(asha)).toEqual(['Infosys: interview slots', 'Infosys: all applicants', 'Welcome to the season']);
    expect(await titlesFor(rohan)).toEqual(['Infosys: all applicants', 'Welcome to the season']);
    expect(await titlesFor(asha, { drive: infosys._id.toString() })).toEqual(['Infosys: interview slots', 'Infosys: all applicants']);
    expect(await titlesFor(asha, { drive: tcs._id.toString() })).toEqual([]);
  });

  it('hides who posted from students but shows officers the audience size', async () => {
    const admin = await createAdmin();
    const student = await createStudent();
    await post(admin);

    const asStudent = await request(app).get('/api/announcements').set(bearer(student));
    expect(asStudent.body.data[0].createdBy).toBeUndefined();
    expect(asStudent.body.data[0].audienceCount).toBeUndefined();

    const asAdmin = await request(app).get('/api/announcements').set(bearer(admin));
    expect(asAdmin.body.data[0]).toMatchObject({ createdBy: admin._id.toString(), audienceCount: 1 });
  });

  it('paginates newest first', async () => {
    const admin = await createAdmin();
    for (let i = 1; i <= 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await post(admin, { title: `Notice ${i}` });
    }
    const res = await request(app).get('/api/announcements').query({ limit: 2, page: 2 }).set(bearer(admin));
    expect(res.body.data.map((a) => a.title)).toEqual(['Notice 1']);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });
});

describe('DELETE /api/announcements/:id', () => {
  it('deletes an announcement', async () => {
    const admin = await createAdmin();
    const { body } = await post(admin);

    const res = await request(app).delete(`/api/announcements/${body.announcement._id}`).set(bearer(admin));
    expect(res.status).toBe(200);
    expect(await Announcement.countDocuments()).toBe(0);

    const again = await request(app).delete(`/api/announcements/${body.announcement._id}`).set(bearer(admin));
    expect(again.status).toBe(404);
  });

  it("is removed along with its drive", async () => {
    const admin = await createAdmin();
    const drive = await createDrive(admin);
    await post(admin, { drive: drive._id.toString() });
    await post(admin, { title: 'For everyone' });

    await request(app).delete(`/api/drives/${drive._id}`).set(bearer(admin));
    expect(await Announcement.find().distinct('title')).toEqual(['For everyone']);
  });
});
