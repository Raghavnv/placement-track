const request = require('supertest');
const app = require('../app');
const { DAY, createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

describe('GET /api/admin/calendar', () => {
  it('returns drives whose deadline or drive day falls in the range, with applicant counts', async () => {
    const admin = await createAdmin();
    const now = Date.now();
    const inRange = await createDrive(admin, { companyName: 'Zoho', deadline: new Date(now + 3 * DAY) });
    await createDrive(admin, { companyName: 'Bosch', deadline: new Date(now - 20 * DAY), driveDate: new Date(now + 5 * DAY) });
    await createDrive(admin, { companyName: 'Later', deadline: new Date(now + 40 * DAY) });
    await createApplication(await createStudent(), inRange);

    const res = await request(app)
      .get('/api/admin/calendar')
      .query({ from: new Date(now).toISOString(), to: new Date(now + 30 * DAY).toISOString() })
      .set(bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.map((d) => [d.companyName, d.applicantCount])).toEqual([['Bosch', 0], ['Zoho', 1]]);
  });

  it('validates the range and is for officers only', async () => {
    const admin = await createAdmin();
    const bad = await request(app).get('/api/admin/calendar').query({ from: '2026-01-01', to: '2026-06-01' }).set(bearer(admin));
    expect(bad.status).toBe(400);
    expect((await request(app).get('/api/admin/calendar').query({ from: 'x', to: 'y' }).set(bearer(admin))).status).toBe(400);
    expect((await request(app).get('/api/admin/calendar').query({ from: '2026-11-01', to: '2026-12-01' }).set(bearer(await createStudent()))).status).toBe(403);
  });
});
