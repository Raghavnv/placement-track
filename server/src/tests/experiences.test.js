const request = require('supertest');
const app = require('../app');
const { createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

const body = (overrides = {}) => ({
  companyName: 'Zoho Corporation',
  role: 'Member Technical Staff',
  year: 2026,
  result: 'selected',
  difficulty: 4,
  rounds: [
    { name: 'Written test', details: 'Two hours of C output questions and three coding problems on arrays and strings.' },
    { name: 'Technical interview', details: 'Asked to design a parking lot, then optimise a string search I wrote on paper.' },
  ],
  tips: 'Practise writing code on paper.',
  ...overrides,
});
const post = (user, overrides) => request(app).post('/api/experiences').set(bearer(user)).send(body(overrides));

describe('interview experiences', () => {
  it('lets a student share one and others find it by company, however it is spelt', async () => {
    const author = await createStudent({ name: 'Asha Rao', branch: 'CSE', graduationYear: 2026 });
    const reader = await createStudent();

    const created = await post(author);
    expect(created.status).toBe(201);
    expect(created.body.experience).toMatchObject({ companyName: 'Zoho Corporation', mine: true, author: { name: 'Asha Rao', branch: 'CSE', graduationYear: 2026 } });

    const res = await request(app).get('/api/experiences').query({ company: 'ZOHO' }).set(bearer(reader));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ mine: false, rounds: [{ name: 'Written test' }, { name: 'Technical interview' }] });
    expect(res.body.data[0]).not.toHaveProperty('companyKey');

    const companies = await request(app).get('/api/experiences/companies').set(bearer(reader));
    expect(companies.body.data).toEqual([{ companyName: 'Zoho Corporation', count: 1 }]);
  });

  it('hides the name of anonymous posts from students but not from officers or the author', async () => {
    const author = await createStudent({ name: 'Asha Rao' });
    await post(author, { anonymous: true });

    const asStudent = await request(app).get('/api/experiences').set(bearer(await createStudent()));
    expect(asStudent.body.data[0].author).toMatchObject({ name: 'Anonymous student', branch: 'CSE' });
    expect((await request(app).get('/api/experiences').set(bearer(await createAdmin()))).body.data[0].author.name).toBe('Asha Rao');
    expect((await request(app).get('/api/experiences').set(bearer(author))).body.data[0].author.name).toBe('Asha Rao');
  });

  it('only links a write-up to a drive the student applied to', async () => {
    const admin = await createAdmin();
    const drive = await createDrive(admin, { companyName: 'Zoho' });
    const [applied, outsider] = await Promise.all([createStudent(), createStudent()]);
    await createApplication(applied, drive);

    expect((await post(applied, { driveId: drive._id.toString() })).body.experience.drive).toBe(drive._id.toString());
    expect((await post(outsider, { driveId: drive._id.toString() })).status).toBe(403);
  });

  it('validates the write-up and who can post or delete', async () => {
    const admin = await createAdmin();
    const [author, other] = await Promise.all([createStudent(), createStudent()]);

    const invalid = await post(author, { rounds: [{ name: 'OA', details: 'Easy' }], difficulty: 9 });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['difficulty', 'rounds.0.details']));
    expect((await post(admin)).status).toBe(403);

    const { body: created } = await post(author);
    const id = created.experience._id;
    expect((await request(app).delete(`/api/experiences/${id}`).set(bearer(other))).status).toBe(403);
    expect((await request(app).delete(`/api/experiences/${id}`).set(bearer(admin))).status).toBe(200);
    expect((await request(app).delete(`/api/experiences/${id}`).set(bearer(author))).status).toBe(404);
  });

  it('searches by company or role', async () => {
    const author = await createStudent();
    await Promise.all([post(author), post(author, { companyName: 'Infosys', role: 'Systems Engineer' })]);
    const res = await request(app).get('/api/experiences').query({ search: 'systems' }).set(bearer(author));
    expect(res.body.data.map((e) => e.companyName)).toEqual(['Infosys']);
  });
});
