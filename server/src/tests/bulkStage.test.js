const request = require('supertest');
const app = require('../app');
const Application = require('../models/Application');
const { createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

const move = (user, drive, body) => request(app).post(`/api/drives/${drive._id}/applicants/stage`).set(bearer(user)).send(body);

async function setup() {
  const admin = await createAdmin();
  const drive = await createDrive(admin);
  const students = await Promise.all([1, 2, 3, 4].map(() => createStudent()));
  const [a, b, c, d] = await Promise.all([
    createApplication(students[0], drive),
    createApplication(students[1], drive),
    createApplication(students[2], drive, { stage: 'aptitude' }),
    createApplication(students[3], drive, { stage: 'rejected' }),
  ]);
  return { admin, drive, students, apps: [a, b, c, d] };
}

describe('POST /api/drives/:id/applicants/stage', () => {
  it('moves selected applicants and records the remark in their history', async () => {
    const { admin, drive, apps } = await setup();

    const res = await move(admin, drive, {
      stage: 'aptitude',
      remark: 'Online test on Friday, 10 am',
      applicationIds: [apps[0]._id, apps[1]._id].map(String),
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ stage: 'aptitude', moved: 2, skipped: [], notFound: [] });

    const moved = await Application.findById(apps[0]._id).lean();
    expect(moved.stage).toBe('aptitude');
    expect(moved.stageHistory.at(-1)).toMatchObject({ stage: 'aptitude', remark: 'Online test on Friday, 10 am', changedBy: admin._id });
  });

  it('moves by pasted roll numbers, case-insensitively, and reports what it could not do', async () => {
    const { admin, drive, students } = await setup();
    const outsider = await createStudent();

    const res = await move(admin, drive, {
      stage: 'aptitude',
      rollNumbers: [students[0].rollNumber.toLowerCase(), students[0].rollNumber, students[2].rollNumber, students[3].rollNumber, outsider.rollNumber, 'NOPE123'],
    });

    expect(res.status).toBe(200);
    expect(res.body.moved).toBe(1);
    expect(res.body.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rollNumber: students[2].rollNumber, stage: 'aptitude', reason: 'Already at Aptitude Test' }),
        expect.objectContaining({ rollNumber: students[3].rollNumber, stage: 'rejected', reason: 'Rejected is a final stage' }),
      ]),
    );
    expect(res.body.notFound).toEqual([outsider.rollNumber, 'NOPE123']);
  });

  it('rejects in bulk from any active stage', async () => {
    const { admin, drive, apps } = await setup();
    const res = await move(admin, drive, { stage: 'rejected', applicationIds: apps.map((a) => String(a._id)) });

    expect(res.body.moved).toBe(3);
    expect(res.body.skipped).toEqual([expect.objectContaining({ reason: 'Already at Rejected' })]);
  });

  it("skips stage jumps the pipeline doesn't allow", async () => {
    const { admin, drive, apps } = await setup();
    const res = await move(admin, drive, { stage: 'offer', applicationIds: [String(apps[0]._id)] });

    expect(res.body.moved).toBe(0);
    expect(res.body.skipped[0].reason).toBe("Can't move from Applied to Offer");
    expect((await Application.findById(apps[0]._id)).stage).toBe('applied');
  });

  it("ignores applications from another drive", async () => {
    const { admin, drive } = await setup();
    const other = await createDrive(admin);
    const foreign = await createApplication(await createStudent(), other);

    const res = await move(admin, drive, { stage: 'aptitude', applicationIds: [String(foreign._id)] });

    expect(res.body).toMatchObject({ moved: 0, notFound: [String(foreign._id)] });
    expect((await Application.findById(foreign._id)).stage).toBe('applied');
  });

  it('needs exactly one of applicationIds or rollNumbers', async () => {
    const { admin, drive, apps } = await setup();
    const neither = await move(admin, drive, { stage: 'aptitude' });
    const both = await move(admin, drive, { stage: 'aptitude', applicationIds: [String(apps[0]._id)], rollNumbers: ['X'] });
    const blank = await move(admin, drive, { stage: 'aptitude', rollNumbers: ['  ', ''] });

    expect([neither.status, both.status, blank.status]).toEqual([400, 400, 400]);
    expect(blank.body.error.details[0]).toMatchObject({ field: 'rollNumbers', message: 'Paste at least one roll number' });
  });

  it('returns 404 for an unknown drive and is admin-only', async () => {
    const { admin, drive, students, apps } = await setup();
    const missing = await move(admin, { _id: '64b000000000000000000000' }, { stage: 'aptitude', rollNumbers: ['X'] });
    const asStudent = await move(students[0], drive, { stage: 'aptitude', applicationIds: [String(apps[0]._id)] });

    expect(missing.status).toBe(404);
    expect(asStudent.status).toBe(403);
  });
});
