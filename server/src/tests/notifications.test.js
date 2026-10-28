const request = require('supertest');
const app = require('../app');
const env = require('../config/env');
const Notification = require('../models/Notification');
const { DAY, createStudent, createAdmin, createDrive, createApplication, bearer } = require('./setup/factories');

const inbox = async (user) => (await request(app).get('/api/notifications').set(bearer(user))).body;
const flush = () => new Promise((resolve) => setTimeout(resolve, 30)); // emails go out in the background

const goodFit = {
  skills: ['Java', 'SQL', 'React'],
  preferredRoles: ['software'],
  interests: ['web'],
  preferredLocations: ['Bengaluru'],
  jobTypes: ['full-time'],
  expectedPackage: 6,
};

const newDrive = (admin, body = {}) =>
  request(app)
    .post('/api/drives')
    .set(bearer(admin))
    .send({
      companyName: 'Zoho',
      role: 'Software Engineer',
      package: 9,
      location: 'Bengaluru',
      jobType: 'full-time',
      skills: ['Java', 'SQL', 'React'],
      eligibility: { minCgpa: 7, branches: [], maxBacklogs: 0 },
      deadline: new Date(Date.now() + 5 * DAY).toISOString(),
      ...body,
    });

afterEach(() => {
  jest.restoreAllMocks();
  env.brevoApiKey = undefined;
  env.emailFrom = undefined;
});

describe('notifications', () => {
  it('tells a student when an officer moves them, with the remark', async () => {
    const admin = await createAdmin();
    const drive = await createDrive(admin, { companyName: 'Infosys', role: 'Systems Engineer' });
    const student = await createStudent();
    const application = await createApplication(student, drive);

    await request(app).patch(`/api/applications/${application._id}/stage`).set(bearer(admin)).send({ stage: 'aptitude', remark: 'Test at 10 am, Lab 2' });

    const { data, unreadCount } = await inbox(student);
    expect(unreadCount).toBe(1);
    expect(data[0]).toMatchObject({
      type: 'stage',
      title: 'Aptitude Test: Infosys',
      body: "You're through to the aptitude test for Systems Engineer at Infosys.\nNote from the placement cell: Test at 10 am, Lab 2",
      link: '/student/applications',
      readAt: null,
    });
    expect(data[0]).not.toHaveProperty('user');
  });

  it('tells everyone moved in a bulk shortlist, and only them', async () => {
    const admin = await createAdmin();
    const drive = await createDrive(admin, { companyName: 'TCS', role: 'Ninja' });
    const [a, b, c] = await Promise.all([createStudent(), createStudent(), createStudent()]);
    await Promise.all([createApplication(a, drive), createApplication(b, drive), createApplication(c, drive, { stage: 'rejected' })]);

    await request(app).post(`/api/drives/${drive._id}/applicants/stage`).set(bearer(admin)).send({ stage: 'aptitude', rollNumbers: [a.rollNumber, b.rollNumber, c.rollNumber] });

    expect((await inbox(a)).data[0].title).toBe('Aptitude Test: TCS');
    expect((await inbox(b)).unreadCount).toBe(1);
    expect((await inbox(c)).unreadCount).toBe(0);
  });

  it("sends announcements to the announcement's audience", async () => {
    const admin = await createAdmin();
    const drive = await createDrive(admin, { companyName: 'Accenture' });
    const [interviewing, applied, outsider] = await Promise.all([createStudent(), createStudent(), createStudent()]);
    await Promise.all([createApplication(interviewing, drive, { stage: 'interview' }), createApplication(applied, drive)]);

    await request(app).post('/api/announcements').set(bearer(admin)).send({ title: 'Interview slots', message: 'Friday, Block C', drive: drive._id.toString(), stages: ['interview'] });
    await request(app).post('/api/announcements').set(bearer(admin)).send({ title: 'Resume workshop', message: 'All final years, Saturday' });

    expect((await inbox(interviewing)).data.map((n) => n.title)).toEqual(['Resume workshop', 'Accenture: Interview slots']);
    expect((await inbox(applied)).data.map((n) => n.title)).toEqual(['Resume workshop']);
    expect((await inbox(outsider)).data[0]).toMatchObject({ type: 'announcement', link: '/student' });
  });

  it('tells eligible students about a new drive that fits them well, respecting the offer policy', async () => {
    const admin = await createAdmin();
    const fit = await createStudent(goodFit);
    const poorFit = await createStudent({ skills: ['AutoCAD'], preferredRoles: ['core'], jobTypes: ['internship'] });
    const lowCgpa = await createStudent({ ...goodFit, cgpa: 6.5 });
    const superDreamHolder = await createStudent(goodFit);
    await createApplication(superDreamHolder, await createDrive(admin, { package: 20 }), { stage: 'offer' });

    const res = await newDrive(admin);
    expect(res.status).toBe(201);

    const [note] = (await inbox(fit)).data;
    expect(note).toMatchObject({ type: 'drive', title: 'New drive that fits you: Software Engineer at Zoho', link: `/student/drives/${res.body.drive._id}` });
    expect(note.body).toMatch(/^₹9 LPA · Bengaluru\. Apply by \d+ \w+, /);
    for (const student of [poorFit, lowCgpa, superDreamHolder]) expect((await inbox(student)).unreadCount).toBe(0);
  });

  it('marks notifications read, all or by id, only for their owner', async () => {
    const admin = await createAdmin();
    const [student, other] = await Promise.all([createStudent(), createStudent()]);
    const notes = await Notification.insertMany(['One', 'Two', 'Three'].map((title) => ({ user: student._id, type: 'announcement', title })));
    await Notification.create({ user: other._id, type: 'announcement', title: 'Theirs' });

    await request(app).post('/api/notifications/read').set(bearer(student)).send({ ids: [notes[0]._id.toString()] });
    expect((await inbox(student)).unreadCount).toBe(2);

    const all = await request(app).post('/api/notifications/read').set(bearer(student)).send({});
    expect(all.body.marked).toBe(2);
    expect((await inbox(student)).unreadCount).toBe(0);
    expect((await inbox(other)).unreadCount).toBe(1);

    expect((await request(app).post('/api/notifications/read').set(bearer(admin)).send({ ids: ['nope'] })).status).toBe(400);
  });

  it('emails through Brevo when set up, skipping students who opted out', async () => {
    env.brevoApiKey = 'test-brevo';
    env.emailFrom = 'PlacementTrack <noreply@college.edu>';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
    const admin = await createAdmin();
    const [keen, quiet] = await Promise.all([createStudent(), createStudent({ emailNotifications: false })]);

    await request(app).post('/api/announcements').set(bearer(admin)).send({ title: 'Placement talk <today>', message: 'Hall A' });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.headers['api-key']).toBe('test-brevo');
    expect(body.sender).toEqual({ name: 'PlacementTrack', email: 'noreply@college.edu' });
    expect(body.messageVersions).toEqual([{ to: [{ email: keen.email, name: keen.name }] }]);
    expect(body.htmlContent).toContain('Placement talk &lt;today&gt;');
    expect((await inbox(quiet)).unreadCount).toBe(1); // still told in the app
  });

  it("doesn't fail the officer's action when email fails", async () => {
    env.brevoApiKey = 'test-brevo';
    env.emailFrom = 'noreply@college.edu';
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    const admin = await createAdmin();
    await createStudent();

    const res = await request(app).post('/api/announcements').set(bearer(admin)).send({ title: 'Heads up', message: 'Tomorrow' });
    await flush();

    expect(res.status).toBe(201);
    expect(logged).toHaveBeenCalledWith('Notification email failed: Brevo responded 401');
  });

  it('lets students turn notification emails off', async () => {
    const student = await createStudent();
    const res = await request(app).patch('/api/auth/me').set(bearer(student)).send({ emailNotifications: false });
    expect(res.body.user.emailNotifications).toBe(false);
  });
});
