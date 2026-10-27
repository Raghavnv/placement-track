const request = require('supertest');
const app = require('../app');
const Drive = require('../models/Drive');
const Application = require('../models/Application');
const { DAY, createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

let admin;
let student;

beforeEach(async () => {
  admin = await createAdmin();
  student = await createStudent({ cgpa: 8, branch: 'CSE', graduationYear: 2027, backlogs: 0 });
});

const validDrive = () => ({
  companyName: 'Zoho',
  role: 'Member Technical Staff',
  package: 8.4,
  location: 'Chennai',
  jobType: 'full-time',
  eligibility: { minCgpa: 7.5, branches: ['CSE', 'ISE'], graduationYear: 2027, maxBacklogs: 0 },
  deadline: new Date(Date.now() + 3 * DAY).toISOString(),
  driveDate: new Date(Date.now() + 8 * DAY).toISOString(),
});

describe('GET /api/drives', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/drives');
    expect(res.status).toBe(401);
  });

  it('shows students open drives soonest-deadline first, with eligibility and applied flags', async () => {
    const later = await createDrive(admin, { companyName: 'Later', deadline: new Date(Date.now() + 9 * DAY) });
    await createDrive(admin, { companyName: 'Sooner', deadline: new Date(Date.now() + 1 * DAY) });
    await createDrive(admin, { companyName: 'Closed', status: 'closed' });
    await createDrive(admin, { companyName: 'TooHigh', eligibility: { minCgpa: 9.5 } });
    await createApplication(student, later);

    const res = await request(app).get('/api/drives').set(bearer(student));

    expect(res.status).toBe(200);
    expect(res.body.data.map((d) => d.companyName)).toEqual(['Sooner', 'TooHigh', 'Later']);
    const byName = Object.fromEntries(res.body.data.map((d) => [d.companyName, d]));
    expect(byName.Later).toMatchObject({ hasApplied: true, isEligible: true, applicantCount: 1 });
    expect(byName.Sooner).toMatchObject({ hasApplied: false, isEligible: true, applicantCount: 0 });
    expect(byName.TooHigh.isEligible).toBe(false);
    expect(res.body.pagination).toEqual({ page: 1, limit: 10, total: 3, totalPages: 1 });
  });

  it('shows admins every drive without student-only flags', async () => {
    await createDrive(admin);
    await createDrive(admin, { status: 'closed' });
    const res = await request(app).get('/api/drives').set(bearer(admin));
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].isEligible).toBeUndefined();
  });

  it('filters by search, job type, minimum package and eligibility', async () => {
    await createDrive(admin, { companyName: 'Infosys', package: 6.5 });
    await createDrive(admin, { companyName: 'Google', role: 'SWE Intern', jobType: 'internship', package: 14 });
    await createDrive(admin, { companyName: 'Bosch', package: 5.5, eligibility: { minCgpa: 6, branches: ['ME'] } });

    const get = (query) => request(app).get(`/api/drives?${query}`).set(bearer(student));
    const names = (res) => res.body.data.map((d) => d.companyName).sort();

    expect(names(await get('search=swe'))).toEqual(['Google']);
    expect(names(await get('search=info'))).toEqual(['Infosys']);
    expect(names(await get('jobType=internship'))).toEqual(['Google']);
    expect(names(await get('minPackage=6'))).toEqual(['Google', 'Infosys']);
    expect(names(await get('eligibleOnly=true'))).toEqual(['Google', 'Infosys']);
    expect(names(await get('search=&jobType=&eligibleOnly=true'))).toEqual(['Google', 'Infosys']);
  });

  it('paginates and sorts by package', async () => {
    await Promise.all([3, 9, 6].map((pkg) => createDrive(admin, { package: pkg })));
    const res = await request(app).get('/api/drives?sort=-package&page=2&limit=2').set(bearer(student));
    expect(res.body.data.map((d) => d.package)).toEqual([3]);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('rejects invalid query parameters', async () => {
    const res = await request(app).get('/api/drives?limit=500&sort=random').set(bearer(student));
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['limit', 'sort']);
  });
});

describe('GET /api/drives/:id', () => {
  it('returns an eligibility checklist for students', async () => {
    const drive = await createDrive(admin, { eligibility: { minCgpa: 8.5, branches: ['CSE'] } });
    const res = await request(app).get(`/api/drives/${drive.id}`).set(bearer(student));

    expect(res.status).toBe(200);
    expect(res.body.drive).toMatchObject({ companyName: 'Infosys', isEligible: false, hasApplied: false });
    expect(res.body.drive.eligibilityChecks.find((c) => c.field === 'cgpa')).toMatchObject({ passed: false, actual: 8 });
  });

  it('returns 400 INVALID_ID and 404 NOT_FOUND', async () => {
    const bad = await request(app).get('/api/drives/not-an-id').set(bearer(student));
    const missing = await request(app).get('/api/drives/6650f1c2a1b2c3d4e5f60101').set(bearer(student));
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_ID');
    expect(missing.status).toBe(404);
  });
});

describe('POST /api/drives', () => {
  it('lets an admin create a drive', async () => {
    const res = await request(app).post('/api/drives').set(bearer(admin)).send(validDrive());
    expect(res.status).toBe(201);
    expect(res.body.drive).toMatchObject({ companyName: 'Zoho', status: 'open', applicantCount: 0, createdBy: admin.id });
  });

  it('applies eligibility defaults', async () => {
    const body = { ...validDrive(), eligibility: { minCgpa: 6 } };
    const res = await request(app).post('/api/drives').set(bearer(admin)).send(body);
    expect(res.body.drive.eligibility).toEqual({ minCgpa: 6, branches: [], graduationYear: null, maxBacklogs: 0 });
  });

  it('forbids students', async () => {
    const res = await request(app).post('/api/drives').set(bearer(student)).send(validDrive());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('validates required fields and dates', async () => {
    const res = await request(app)
      .post('/api/drives')
      .set(bearer(admin))
      .send({
        ...validDrive(),
        companyName: '',
        package: -1,
        deadline: new Date(Date.now() - DAY).toISOString(),
        driveDate: new Date(Date.now() - 2 * DAY).toISOString(),
      });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['companyName', 'deadline', 'driveDate', 'package']);
  });
});

describe('PUT /api/drives/:id', () => {
  it('updates fields and merges partial eligibility', async () => {
    const drive = await createDrive(admin, { eligibility: { minCgpa: 7, branches: ['CSE'], maxBacklogs: 1 } });
    const res = await request(app)
      .put(`/api/drives/${drive.id}`)
      .set(bearer(admin))
      .send({ package: 7.2, status: 'closed', eligibility: { minCgpa: 7.5 } });

    expect(res.status).toBe(200);
    expect(res.body.drive).toMatchObject({ package: 7.2, status: 'closed' });
    expect(res.body.drive.eligibility).toMatchObject({ minCgpa: 7.5, branches: ['CSE'], maxBacklogs: 1 });
  });

  it('checks the drive date against the stored deadline', async () => {
    const drive = await createDrive(admin, { deadline: new Date(Date.now() + 5 * DAY) });
    const res = await request(app)
      .put(`/api/drives/${drive.id}`)
      .set(bearer(admin))
      .send({ driveDate: new Date(Date.now() + DAY).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('driveDate');
  });

  it('rejects an empty update and unknown drives', async () => {
    const drive = await createDrive(admin);
    const empty = await request(app).put(`/api/drives/${drive.id}`).set(bearer(admin)).send({});
    const missing = await request(app).put('/api/drives/6650f1c2a1b2c3d4e5f60101').set(bearer(admin)).send({ package: 5 });
    expect(empty.status).toBe(400);
    expect(missing.status).toBe(404);
  });
});

describe('DELETE /api/drives/:id', () => {
  it('deletes the drive and its applications', async () => {
    const drive = await createDrive(admin);
    await createApplication(student, drive);
    await createApplication(await createStudent(), drive);

    const res = await request(app).delete(`/api/drives/${drive.id}`).set(bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Drive deleted', deletedApplications: 2 });
    expect(await Drive.countDocuments()).toBe(0);
    expect(await Application.countDocuments()).toBe(0);
  });

  it('forbids students', async () => {
    const drive = await createDrive(admin);
    const res = await request(app).delete(`/api/drives/${drive.id}`).set(bearer(student));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/drives/:id/apply', () => {
  it('creates an application in the applied stage', async () => {
    const drive = await createDrive(admin);
    const res = await request(app).post(`/api/drives/${drive.id}/apply`).set(bearer(student));

    expect(res.status).toBe(201);
    expect(res.body.application).toMatchObject({ stage: 'applied', student: student.id, notes: '' });
    expect(res.body.application.drive).toMatchObject({ _id: drive.id, companyName: 'Infosys' });
    expect(res.body.application.stageHistory).toEqual([
      expect.objectContaining({ stage: 'applied', changedBy: student.id }),
    ]);
  });

  it('returns 409 ALREADY_APPLIED the second time', async () => {
    const drive = await createDrive(admin);
    await request(app).post(`/api/drives/${drive.id}/apply`).set(bearer(student));
    const res = await request(app).post(`/api/drives/${drive.id}/apply`).set(bearer(student));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_APPLIED');
  });

  it('returns 409 DRIVE_CLOSED for closed drives', async () => {
    const drive = await createDrive(admin, { status: 'closed' });
    const res = await request(app).post(`/api/drives/${drive.id}/apply`).set(bearer(student));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DRIVE_CLOSED');
  });

  it('returns 400 DEADLINE_PASSED after the deadline', async () => {
    const drive = await createDrive(admin, { deadline: new Date(Date.now() - DAY) });
    const res = await request(app).post(`/api/drives/${drive.id}/apply`).set(bearer(student));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DEADLINE_PASSED');
  });

  it('returns 403 NOT_ELIGIBLE listing the failed criteria', async () => {
    const drive = await createDrive(admin, { eligibility: { minCgpa: 9, branches: ['ECE'] } });
    const res = await request(app).post(`/api/drives/${drive.id}/apply`).set(bearer(student));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ELIGIBLE');
    expect(res.body.error.details.map((d) => d.field)).toEqual(['cgpa', 'branch']);
  });

  it('forbids admins from applying and handles unknown drives', async () => {
    const drive = await createDrive(admin);
    const asAdmin = await request(app).post(`/api/drives/${drive.id}/apply`).set(bearer(admin));
    const missing = await request(app).post('/api/drives/6650f1c2a1b2c3d4e5f60101/apply').set(bearer(student));
    expect(asAdmin.status).toBe(403);
    expect(missing.status).toBe(404);
  });
});

describe('GET /api/drives/:id/applicants', () => {
  it('lists applicants with stage counts and never exposes notes', async () => {
    const drive = await createDrive(admin);
    const other = await createStudent({ name: 'Meera Pillai', rollNumber: '21IS051' });
    await createApplication(student, drive, { notes: 'secret prep notes' });
    await createApplication(other, drive, { stage: 'interview' });

    const res = await request(app).get(`/api/drives/${drive.id}/applicants`).set(bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.drive.companyName).toBe('Infosys');
    expect(res.body.stageCounts).toEqual({ applied: 1, aptitude: 0, interview: 1, offer: 0, rejected: 0 });
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].student).toEqual(expect.objectContaining({ name: expect.any(String), rollNumber: expect.any(String) }));
    expect(JSON.stringify(res.body)).not.toContain('secret prep notes');
  });

  it('filters by stage and searches by name or roll number', async () => {
    const drive = await createDrive(admin);
    await createApplication(await createStudent({ name: 'Meera Pillai', rollNumber: '21IS051' }), drive, { stage: 'interview' });
    await createApplication(student, drive);

    const byStage = await request(app).get(`/api/drives/${drive.id}/applicants?stage=interview`).set(bearer(admin));
    const byName = await request(app).get(`/api/drives/${drive.id}/applicants?search=meera`).set(bearer(admin));
    const byRoll = await request(app).get(`/api/drives/${drive.id}/applicants?search=21is`).set(bearer(admin));

    expect(byStage.body.data.map((a) => a.student.name)).toEqual(['Meera Pillai']);
    expect(byStage.body.stageCounts.applied).toBe(1); // counts ignore the filter
    expect(byName.body.data).toHaveLength(1);
    expect(byRoll.body.data).toHaveLength(1);
  });

  it('forbids students', async () => {
    const drive = await createDrive(admin);
    const res = await request(app).get(`/api/drives/${drive.id}/applicants`).set(bearer(student));
    expect(res.status).toBe(403);
  });
});
