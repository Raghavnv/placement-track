const request = require('supertest');
const app = require('../app');
const { createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

const offer = (student, drive) =>
  createApplication(student, drive, {
    stage: 'offer',
    stageHistory: ['applied', 'aptitude', 'interview', 'offer'].map((stage) => ({ stage, changedBy: student._id })),
  });

describe('GET /api/admin/report', () => {
  it('summarises the season using each placed student\'s best full-time offer', async () => {
    const admin = await createAdmin();
    const [tcs, zoho, google, intern] = await Promise.all([
      createDrive(admin, { companyName: 'TCS', role: 'Ninja', package: 4 }),
      createDrive(admin, { companyName: 'Zoho', role: 'MTS', package: 9 }),
      createDrive(admin, { companyName: 'Google', role: 'SWE', package: 20 }),
      createDrive(admin, { companyName: 'Intuit', role: 'Intern', package: 6, jobType: 'internship' }),
    ]);
    const [asha, rohan, priya, karthik] = await Promise.all([
      createStudent({ branch: 'CSE' }),
      createStudent({ branch: 'CSE' }),
      createStudent({ branch: 'ECE' }),
      createStudent({ branch: 'ECE', cgpa: 6.1 }),
    ]);
    await Promise.all([
      offer(asha, tcs),
      offer(asha, zoho), // two offers: best is Zoho at 9
      offer(rohan, google),
      offer(priya, intern), // internship only: not placed
      createApplication(karthik, tcs, { stage: 'aptitude' }),
    ]);

    const res = await request(app).get('/api/admin/report').set(bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({
      students: 4, placed: 2, placementRate: 50, fullTimeOffers: 3, internshipOffers: 1, multipleOffers: 1, companies: 4, drives: 4,
    });
    expect(res.body.packages).toEqual({ highest: 20, median: 14.5, average: 14.5, lowest: 9 });
    expect(res.body.byBranch).toEqual([
      { branch: 'CSE', students: 2, placed: 2, rate: 100, median: 14.5 },
      { branch: 'ECE', students: 2, placed: 0, rate: 0, median: 0 },
    ]);
    expect(res.body.byTier).toEqual([
      { tier: 'regular', label: 'Regular', students: 0 },
      { tier: 'dream', label: 'Dream', students: 1 },
      { tier: 'super-dream', label: 'Super Dream', students: 1 },
    ]);
    expect(res.body.byCompany[0]).toMatchObject({ companyName: 'Google', offers: 1, highest: 20 });
    expect(res.body.funnel.map((f) => [f.stage, f.reached])).toEqual([['applied', 5], ['aptitude', 4], ['interview', 4], ['offer', 4]]);
    expect(res.body.unplaced.map((s) => [s.branch, s.applications, s.active])).toEqual([['ECE', 1, 0], ['ECE', 1, 1]]);
  });

  it('filters by batch and is for officers only', async () => {
    const admin = await createAdmin();
    await Promise.all([createStudent({ graduationYear: 2027 }), createStudent({ graduationYear: 2026 })]);

    const res = await request(app).get('/api/admin/report').query({ graduationYear: 2026 }).set(bearer(admin));
    expect(res.body.summary.students).toBe(1);
    expect(res.body.graduationYear).toBe(2026);

    expect((await request(app).get('/api/admin/report').set(bearer(await createStudent()))).status).toBe(403);
  });
});
