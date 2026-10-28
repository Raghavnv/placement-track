const request = require('supertest');
const app = require('../app');
const { createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

// A student who got an offer from a drive with this package.
async function placedStudent(admin, offerPackage, jobType = 'full-time') {
  const student = await createStudent();
  const offerDrive = await createDrive(admin, { companyName: 'TCS', package: offerPackage, jobType });
  await createApplication(student, offerDrive, { stage: 'offer' });
  return student;
}

const apply = (student, drive) => request(app).post(`/api/drives/${drive._id}/apply`).set(bearer(student));

describe('placement policy', () => {
  it('tiers full-time drives by package with the default cutoffs', async () => {
    const admin = await createAdmin();
    await Promise.all([6, 8, 15].map((pkg) => createDrive(admin, { package: pkg, companyName: `Co ${pkg}` })));
    await createDrive(admin, { package: 20, companyName: 'Intern Co', jobType: 'internship' });

    const res = await request(app).get('/api/drives').query({ status: 'all', sort: '-package' }).set(bearer(admin));
    expect(res.body.data.map((d) => [d.package, d.tier])).toEqual([
      [20, null],
      [15, 'super-dream'],
      [8, 'dream'],
      [6, 'regular'],
    ]);
  });

  it('lets a Regular offer holder apply only to Dream and above', async () => {
    const admin = await createAdmin();
    const student = await placedStudent(admin, 4);
    const regular = await createDrive(admin, { companyName: 'Wipro', package: 6 });
    const dream = await createDrive(admin, { companyName: 'Zoho', package: 9 });

    const blocked = await apply(student, regular);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('NOT_ELIGIBLE');
    expect(blocked.body.error.details).toEqual([{ field: 'policy', message: 'Requires Dream+ drive (placement policy)' }]);

    expect((await apply(student, dream)).status).toBe(201);
  });

  it('explains the rule in the eligibility checklist and placement status', async () => {
    const admin = await createAdmin();
    const student = await placedStudent(admin, 9);
    const dream = await createDrive(admin, { companyName: 'Zoho', package: 10 });

    const details = await request(app).get(`/api/drives/${dream._id}`).set(bearer(student));
    expect(details.body.drive.isEligible).toBe(false);
    expect(details.body.drive.eligibilityChecks.at(-1)).toEqual({
      field: 'policy',
      label: 'Super Dream+ drive (placement policy)',
      actual: 'Dream offer, TCS',
      passed: false,
    });

    const me = await request(app).get('/api/placement/me').set(bearer(student));
    expect(me.body.placement).toMatchObject({ placed: true, minPackage: 15, canApplyFullTime: true, offer: { companyName: 'TCS', tier: 'dream' } });
    expect(me.body.placement.message).toContain('only to Super Dream+ full-time drives');
  });

  it('stops Super Dream holders from full-time drives but keeps internships open', async () => {
    const admin = await createAdmin();
    const student = await placedStudent(admin, 20);
    const fullTime = await createDrive(admin, { companyName: 'Google', package: 40 });
    const internship = await createDrive(admin, { companyName: 'Intuit', package: 6, jobType: 'internship' });

    expect((await apply(student, fullTime)).status).toBe(403);
    expect((await apply(student, internship)).status).toBe(201);

    const eligible = await request(app).get('/api/drives').query({ eligibleOnly: true }).set(bearer(student));
    expect(eligible.body.data.map((d) => d.companyName)).toEqual(['Intuit']);
    expect((await request(app).get('/api/placement/me').set(bearer(student))).body.placement.canApplyFullTime).toBe(false);
  });

  it('ignores internship offers and students without offers', async () => {
    const admin = await createAdmin();
    const intern = await placedStudent(admin, 5, 'internship');
    const drive = await createDrive(admin, { companyName: 'Wipro', package: 4 });

    expect((await apply(intern, drive)).status).toBe(201);
    expect((await request(app).get('/api/placement/me').set(bearer(intern))).body.placement).toMatchObject({ placed: false, message: null });
  });

  it('lets officers change cutoffs or switch the policy off', async () => {
    const admin = await createAdmin();
    const student = await placedStudent(admin, 4);
    const drive = await createDrive(admin, { companyName: 'Wipro', package: 6 });

    const invalid = await request(app).put('/api/placement/policy').set(bearer(admin)).send({ enabled: true, dreamMinPackage: 10, superDreamMinPackage: 9 });
    expect(invalid.status).toBe(400);

    const lower = await request(app).put('/api/placement/policy').set(bearer(admin)).send({ enabled: true, dreamMinPackage: 5, superDreamMinPackage: 12 });
    expect(lower.body.policy).toMatchObject({ dreamMinPackage: 5, superDreamMinPackage: 12 });
    expect(lower.body.tiers[1]).toEqual({ key: 'dream', label: 'Dream', minPackage: 5, maxPackage: 12 });
    expect((await request(app).get(`/api/drives/${drive._id}`).set(bearer(student))).body.drive.tier).toBe('dream');

    await request(app).put('/api/placement/policy').set(bearer(admin)).send({ enabled: false, dreamMinPackage: 8, superDreamMinPackage: 15 });
    expect((await apply(student, drive)).status).toBe(201);

    expect((await request(app).put('/api/placement/policy').set(bearer(student)).send({})).status).toBe(403);
  });

  it('leaves blocked drives out of deadline reminders', async () => {
    const admin = await createAdmin();
    const student = await placedStudent(admin, 4);
    await createDrive(admin, { companyName: 'Wipro', package: 6, deadline: new Date(Date.now() + 86400000) });
    await createDrive(admin, { companyName: 'Zoho', package: 9, deadline: new Date(Date.now() + 86400000) });

    const res = await request(app).get('/api/applications/me/reminders').set(bearer(student));
    expect(res.body.deadlines.map((d) => d.companyName)).toEqual(['Zoho']);
  });
});
