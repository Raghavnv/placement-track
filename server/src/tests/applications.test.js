const request = require('supertest');
const app = require('../app');
const { DAY, createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

let admin;
let student;
let drive;

beforeEach(async () => {
  admin = await createAdmin();
  student = await createStudent();
  drive = await createDrive(admin);
});

describe('GET /api/applications/me', () => {
  it('returns only my applications with drive details and stage counts', async () => {
    const other = await createDrive(admin, { companyName: 'Wipro' });
    await createApplication(student, drive);
    await createApplication(student, other, { stage: 'interview' });
    await createApplication(await createStudent(), drive);

    const res = await request(app).get('/api/applications/me').set(bearer(student));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].drive).toEqual(expect.objectContaining({ companyName: expect.any(String), package: 6.5 }));
    expect(res.body.countsByStage).toEqual({ applied: 1, aptitude: 0, interview: 1, offer: 0, rejected: 0 });
  });

  it('is student-only', async () => {
    const res = await request(app).get('/api/applications/me').set(bearer(admin));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/applications/:id', () => {
  it('lets the owner read their application including notes', async () => {
    const application = await createApplication(student, drive, { notes: 'DBMS revision' });
    const res = await request(app).get(`/api/applications/${application.id}`).set(bearer(student));
    expect(res.status).toBe(200);
    expect(res.body.application).toMatchObject({ notes: 'DBMS revision', drive: { companyName: 'Infosys' } });
  });

  it("returns 404 for another student's application", async () => {
    const application = await createApplication(await createStudent(), drive);
    const res = await request(app).get(`/api/applications/${application.id}`).set(bearer(student));
    expect(res.status).toBe(404);
  });

  it('lets an admin read any application but hides notes', async () => {
    const application = await createApplication(student, drive, { notes: 'private' });
    const res = await request(app).get(`/api/applications/${application.id}`).set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body.application.notes).toBeUndefined();
    expect(res.body.application.student).toMatchObject({ name: student.name, rollNumber: student.rollNumber });
  });
});

describe('PATCH /api/applications/:id/stage', () => {
  it('moves to the next stage and records history with the remark', async () => {
    const application = await createApplication(student, drive, { notes: 'private' });
    const res = await request(app)
      .patch(`/api/applications/${application.id}/stage`)
      .set(bearer(admin))
      .send({ stage: 'aptitude', remark: 'Online test on 5 Nov' });

    expect(res.status).toBe(200);
    expect(res.body.application.stage).toBe('aptitude');
    expect(res.body.application.notes).toBeUndefined();
    expect(res.body.application.stageHistory.at(-1)).toMatchObject({
      stage: 'aptitude',
      remark: 'Online test on 5 Nov',
      changedBy: admin.id,
    });
  });

  it('allows rejection from any active stage', async () => {
    const application = await createApplication(student, drive, { stage: 'interview' });
    const res = await request(app).patch(`/api/applications/${application.id}/stage`).set(bearer(admin)).send({ stage: 'rejected' });
    expect(res.status).toBe(200);
  });

  it('blocks skipping stages with INVALID_STAGE_TRANSITION', async () => {
    const application = await createApplication(student, drive);
    const res = await request(app).patch(`/api/applications/${application.id}/stage`).set(bearer(admin)).send({ stage: 'offer' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'INVALID_STAGE_TRANSITION',
      message: 'Cannot move from Applied to Offer',
      details: [{ field: 'stage', message: 'Allowed next stages: Aptitude Test, Rejected' }],
    });
  });

  it('treats offer and rejected as final', async () => {
    const application = await createApplication(student, drive, { stage: 'offer' });
    const res = await request(app).patch(`/api/applications/${application.id}/stage`).set(bearer(admin)).send({ stage: 'rejected' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toBe('Offer is a final stage');
  });

  it('validates input and forbids students', async () => {
    const application = await createApplication(student, drive);
    const invalid = await request(app).patch(`/api/applications/${application.id}/stage`).set(bearer(admin)).send({ stage: 'hired' });
    const asStudent = await request(app).patch(`/api/applications/${application.id}/stage`).set(bearer(student)).send({ stage: 'aptitude' });
    const missing = await request(app).patch('/api/applications/6650f1c2a1b2c3d4e5f60201/stage').set(bearer(admin)).send({ stage: 'aptitude' });
    expect(invalid.status).toBe(400);
    expect(asStudent.status).toBe(403);
    expect(missing.status).toBe(404);
  });
});

describe('PATCH /api/applications/:id/notes', () => {
  it('saves notes for the owner', async () => {
    const application = await createApplication(student, drive);
    const res = await request(app)
      .patch(`/api/applications/${application.id}/notes`)
      .set(bearer(student))
      .send({ notes: 'Revise OS scheduling' });
    expect(res.status).toBe(200);
    expect(res.body.application.notes).toBe('Revise OS scheduling');
  });

  it('clears notes with an empty string', async () => {
    const application = await createApplication(student, drive, { notes: 'old' });
    const res = await request(app).patch(`/api/applications/${application.id}/notes`).set(bearer(student)).send({ notes: '' });
    expect(res.body.application.notes).toBe('');
  });

  it("returns 404 for someone else's application and 400 for notes over 5000 chars", async () => {
    const theirs = await createApplication(await createStudent(), drive);
    const mine = await createApplication(student, await createDrive(admin));
    const notMine = await request(app).patch(`/api/applications/${theirs.id}/notes`).set(bearer(student)).send({ notes: 'x' });
    const tooLong = await request(app).patch(`/api/applications/${mine.id}/notes`).set(bearer(student)).send({ notes: 'x'.repeat(5001) });
    expect(notMine.status).toBe(404);
    expect(tooLong.status).toBe(400);
  });

  it('forbids admins', async () => {
    const application = await createApplication(student, drive);
    const res = await request(app).patch(`/api/applications/${application.id}/notes`).set(bearer(admin)).send({ notes: 'x' });
    expect(res.status).toBe(403);
  });
});

describe('reminders and calendar', () => {
  async function setupUpcoming() {
    const soon = await createDrive(admin, { companyName: 'TCS', deadline: new Date(Date.now() + DAY / 2) });
    await createDrive(admin, { companyName: 'Far', deadline: new Date(Date.now() + 20 * DAY) });
    await createDrive(admin, { companyName: 'Ineligible', deadline: new Date(Date.now() + DAY), eligibility: { minCgpa: 9.9 } });
    const applied = await createDrive(admin, {
      companyName: 'Wipro',
      deadline: new Date(Date.now() - 5 * DAY),
      driveDate: new Date(Date.now() + 2 * DAY),
    });
    await createApplication(student, applied, { stage: 'aptitude' });
    const rejected = await createDrive(admin, { companyName: 'Rejected', deadline: new Date(Date.now() - 5 * DAY), driveDate: new Date(Date.now() + DAY) });
    await createApplication(student, rejected, { stage: 'rejected' });
    return { soon };
  }

  it('lists eligible unapplied deadlines and upcoming drive days within the window', async () => {
    await setupUpcoming();
    await createApplication(student, drive); // drive's deadline is in 5 days but already applied

    const res = await request(app).get('/api/applications/me/reminders?days=7').set(bearer(student));

    expect(res.status).toBe(200);
    expect(res.body.deadlines.map((d) => d.companyName)).toEqual(['TCS']);
    expect(res.body.deadlines[0].hoursLeft).toBeLessThanOrEqual(12);
    expect(res.body.upcomingDrives).toEqual([expect.objectContaining({ companyName: 'Wipro', stage: 'aptitude' })]);
  });

  it('exports an iCalendar file with deadlines and drive days', async () => {
    await setupUpcoming();
    const res = await request(app).get('/api/applications/me/calendar.ics').set(bearer(student));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/calendar/);
    expect(res.headers['content-disposition']).toContain('placementtrack.ics');
    expect(res.text).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(res.text).toContain('SUMMARY:Apply: TCS');
    expect(res.text).toContain('SUMMARY:Apply: Far');
    expect(res.text).toContain('SUMMARY:Wipro drive');
    expect(res.text).not.toContain('Ineligible');
    expect(res.text.match(/BEGIN:VEVENT/g)).toHaveLength(4); // TCS, Far, Infosys (unapplied), Wipro
  });

  it('validates the days parameter', async () => {
    const res = await request(app).get('/api/applications/me/reminders?days=99').set(bearer(student));
    expect(res.status).toBe(400);
  });
});
