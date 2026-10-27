const request = require('supertest');
const app = require('../app');
const { DAY, createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

const history = (student, admin, ...stages) =>
  stages.map((stage, i) => ({ stage, changedBy: i === 0 ? student._id : admin._id }));

describe('GET /api/admin/stats', () => {
  it('summarises the placement season', async () => {
    const admin = await createAdmin();
    const [asha, rohan, priya, karthik] = await Promise.all([
      createStudent({ branch: 'CSE' }),
      createStudent({ branch: 'CSE' }),
      createStudent({ branch: 'ISE' }),
      createStudent({ branch: 'ECE', graduationYear: 2026 }),
    ]);
    const infosys = await createDrive(admin, { companyName: 'Infosys', package: 6 });
    const zoho = await createDrive(admin, { companyName: 'Zoho', package: 9 });
    await createDrive(admin, { companyName: 'Old', status: 'closed', deadline: new Date(Date.now() - DAY) });

    await createApplication(asha, infosys, { stage: 'offer', stageHistory: history(asha, admin, 'applied', 'aptitude', 'interview', 'offer') });
    await createApplication(rohan, zoho, { stage: 'offer', stageHistory: history(rohan, admin, 'applied', 'aptitude', 'interview', 'offer') });
    await createApplication(rohan, infosys, { stage: 'rejected', stageHistory: history(rohan, admin, 'applied', 'aptitude', 'rejected') });
    await createApplication(priya, infosys, { stage: 'interview', stageHistory: history(priya, admin, 'applied', 'aptitude', 'interview') });
    await createApplication(karthik, zoho, { stage: 'applied', stageHistory: history(karthik, admin, 'applied') });

    const res = await request(app).get('/api/admin/stats').set(bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ students: 4, drives: 3, openDrives: 2, applications: 5, offers: 2, studentsPlaced: 2 });
    expect(res.body.placementRate).toBe(50);
    expect(res.body.packageStats).toEqual({ highest: 9, average: 7.5, median: 7.5 });
    expect(res.body.applicationsByStage).toEqual({ applied: 1, aptitude: 0, interview: 1, offer: 2, rejected: 1 });
    expect(res.body.funnel).toEqual([
      { stage: 'applied', label: 'Applied', reached: 5, percentOfApplied: 100 },
      { stage: 'aptitude', label: 'Aptitude Test', reached: 4, percentOfApplied: 80 },
      { stage: 'interview', label: 'Interview', reached: 3, percentOfApplied: 60 },
      { stage: 'offer', label: 'Offer', reached: 2, percentOfApplied: 40 },
    ]);
    expect(res.body.placedByBranch).toEqual([
      { branch: 'CSE', placed: 2, total: 2 },
      { branch: 'ECE', placed: 0, total: 1 },
      { branch: 'ISE', placed: 0, total: 1 },
    ]);
    expect(res.body.topDrives[0]).toMatchObject({ companyName: 'Infosys', applicants: 3, offers: 1 });
    expect(res.body.upcomingDeadlines.map((d) => d.companyName).sort()).toEqual(['Infosys', 'Zoho']);
  });

  it('filters by graduation year', async () => {
    const admin = await createAdmin();
    const s2026 = await createStudent({ graduationYear: 2026 });
    await createStudent({ graduationYear: 2027 });
    const drive = await createDrive(admin);
    await createApplication(s2026, drive, { stage: 'offer', stageHistory: history(s2026, admin, 'applied', 'aptitude', 'interview', 'offer') });

    const res = await request(app).get('/api/admin/stats?graduationYear=2026').set(bearer(admin));

    expect(res.body.totals).toMatchObject({ students: 1, applications: 1, studentsPlaced: 1 });
    expect(res.body.placementRate).toBe(100);
  });

  it('returns zeros on an empty database', async () => {
    const admin = await createAdmin();
    const res = await request(app).get('/api/admin/stats').set(bearer(admin));
    expect(res.body.placementRate).toBe(0);
    expect(res.body.packageStats).toEqual({ highest: 0, average: 0, median: 0 });
  });

  it('is admin-only', async () => {
    const res = await request(app).get('/api/admin/stats').set(bearer(await createStudent()));
    expect(res.status).toBe(403);
  });
});
