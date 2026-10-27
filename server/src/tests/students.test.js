const request = require('supertest');
const app = require('../app');
const { createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

const resume = { fileName: 'cv.pdf', mimeType: 'application/pdf', size: 100, uploadedAt: new Date() };

async function setup() {
  const admin = await createAdmin();
  const [tcs, google] = await Promise.all([createDrive(admin, { package: 3.6 }), createDrive(admin, { package: 14.4 })]);
  const [asha, rohan, priya, karthik] = await Promise.all([
    createStudent({ name: 'Asha Rao', rollNumber: '21CS045', branch: 'CSE', cgpa: 8.4, resume }),
    createStudent({ name: 'Rohan Mehta', rollNumber: '21CS012', branch: 'CSE', cgpa: 9.1, graduationYear: 2026 }),
    createStudent({ name: 'Priya Nair', rollNumber: '21IS033', branch: 'ISE', cgpa: 7.8, resume }),
    createStudent({ name: 'Karthik Iyer', rollNumber: '21EC021', branch: 'ECE', cgpa: 7.2 }),
  ]);
  await Promise.all([
    createApplication(asha, tcs, { stage: 'offer' }),
    createApplication(asha, google, { stage: 'offer', notes: 'private prep notes' }),
    createApplication(rohan, google, { stage: 'interview' }),
    createApplication(priya, tcs, { stage: 'rejected' }),
  ]);
  return { admin, students: { asha, rohan, priya, karthik } };
}

const list = (admin, query = {}) => request(app).get('/api/admin/students').query(query).set(bearer(admin));
const rolls = (res) => res.body.data.map((s) => s.rollNumber);

describe('GET /api/admin/students', () => {
  it('lists students by roll number with their season summary and tab counts', async () => {
    const { admin } = await setup();
    const res = await list(admin);

    expect(res.status).toBe(200);
    expect(rolls(res)).toEqual(['21CS012', '21CS045', '21EC021', '21IS033']);
    expect(res.body.counts).toEqual({ all: 4, placed: 1, unplaced: 3, noResume: 2 });

    const asha = res.body.data.find((s) => s.rollNumber === '21CS045');
    expect(asha).toMatchObject({ applicationCount: 2, activeCount: 0, offerCount: 2, bestOffer: 14.4, resume: { fileName: 'cv.pdf' } });
    expect(asha.passwordHash).toBeUndefined();
    expect(res.body.data.find((s) => s.rollNumber === '21EC021')).toMatchObject({ applicationCount: 0, bestOffer: null });
  });

  it.each([
    [{ status: 'placed' }, ['21CS045']],
    [{ status: 'unplaced' }, ['21CS012', '21EC021', '21IS033']],
    [{ resume: 'no' }, ['21CS012', '21EC021']],
    [{ resume: 'yes' }, ['21CS045', '21IS033']],
    [{ branch: 'CSE' }, ['21CS012', '21CS045']],
    [{ graduationYear: 2026 }, ['21CS012']],
    [{ minCgpa: 8 }, ['21CS012', '21CS045']],
    [{ search: 'nair' }, ['21IS033']],
    [{ search: '21ec' }, ['21EC021']],
    [{ branch: 'CSE', status: 'unplaced' }, ['21CS012']],
  ])('filters by %o', async (query, expected) => {
    const { admin } = await setup();
    expect(rolls(await list(admin, query))).toEqual(expected);
  });

  it('keeps tab counts to the other filters', async () => {
    const { admin } = await setup();
    const res = await list(admin, { branch: 'CSE', status: 'placed' });
    expect(res.body.counts).toEqual({ all: 2, placed: 1, unplaced: 1, noResume: 1 });
  });

  it('sorts and paginates', async () => {
    const { admin } = await setup();
    const res = await list(admin, { sort: '-cgpa', limit: 2, page: 1 });
    expect(rolls(res)).toEqual(['21CS012', '21CS045']);
    expect(res.body.pagination).toMatchObject({ total: 4, totalPages: 2 });
  });

  it('is admin-only and validates filters', async () => {
    const { admin, students } = await setup();
    expect((await request(app).get('/api/admin/students').set(bearer(students.asha))).status).toBe(403);
    expect((await list(admin, { branch: 'XYZ' })).status).toBe(400);
  });
});

describe('GET /api/admin/students/:id', () => {
  it("returns the profile and every application, without the student's private notes", async () => {
    const { admin, students } = await setup();
    const res = await request(app).get(`/api/admin/students/${students.asha._id}`).set(bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.student).toMatchObject({ name: 'Asha Rao', rollNumber: '21CS045' });
    expect(res.body.student.passwordHash).toBeUndefined();
    expect(res.body.applications).toHaveLength(2);
    expect(res.body.applications[0].drive).toMatchObject({ companyName: expect.any(String), package: expect.any(Number) });
    expect(res.body.applications.every((a) => a.notes === undefined)).toBe(true);
  });

  it('returns 404 for an officer id or an unknown id', async () => {
    const { admin } = await setup();
    expect((await request(app).get(`/api/admin/students/${admin._id}`).set(bearer(admin))).status).toBe(404);
    expect((await request(app).get('/api/admin/students/64b000000000000000000000').set(bearer(admin))).status).toBe(404);
  });
});
