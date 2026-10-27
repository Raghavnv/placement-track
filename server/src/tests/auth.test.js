const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const { createStudent, createAdmin, bearer } = require('./setup/factories');

const validRegistration = {
  name: 'Asha Rao',
  email: 'Asha@College.edu',
  password: 'Str0ngPass!',
  rollNumber: '21cs045',
  branch: 'CSE',
  cgpa: 8.4,
  graduationYear: 2027,
  phone: '9876543210',
};

describe('POST /api/auth/register', () => {
  it('creates a student and returns a token without the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(validRegistration);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'asha@college.edu', rollNumber: '21CS045', role: 'student', backlogs: 0 });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(jwt.decode(res.body.token)).toMatchObject({ sub: res.body.user._id, role: 'student' });
  });

  it('ignores an attempt to register as admin', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validRegistration, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('student');
  });

  it('returns field-level validation errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validRegistration, email: 'not-an-email', password: 'short', cgpa: 11, branch: 'XYZ' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['email', 'password', 'cgpa', 'branch']));
  });

  it('rejects a duplicate email with 409 EMAIL_TAKEN', async () => {
    await createStudent({ email: 'asha@college.edu' });
    const res = await request(app).post('/api/auth/register').send(validRegistration);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects a duplicate roll number with 409 ROLL_NUMBER_TAKEN', async () => {
    await createStudent({ rollNumber: '21CS045' });
    const res = await request(app).post('/api/auth/register').send(validRegistration);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'ROLL_NUMBER_TAKEN', details: [{ field: 'rollNumber' }] });
  });
});

describe('POST /api/auth/login', () => {
  it('logs in a student with the right password', async () => {
    const student = await createStudent({ email: 'asha@college.edu' });
    const res = await request(app).post('/api/auth/login').send({ email: 'ASHA@college.edu', password: 'Str0ngPass!' });

    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(student._id.toString());
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('logs in an admin and returns the admin role', async () => {
    await createAdmin({ email: 'officer@college.edu' });
    const res = await request(app).post('/api/auth/login').send({ email: 'officer@college.edu', password: 'Str0ngPass!' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });

  it('uses the same 401 for a wrong password and an unknown email', async () => {
    await createStudent({ email: 'asha@college.edu' });
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'asha@college.edu', password: 'nope' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'ghost@college.edu', password: 'nope' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('requires email and password', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toEqual(['email', 'password']);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user', async () => {
    const student = await createStudent();
    const res = await request(app).get('/api/auth/me').set(bearer(student));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(student.email);
  });

  it.each([
    ['no header', {}],
    ['a malformed header', { Authorization: 'Token abc' }],
    ['an invalid token', { Authorization: 'Bearer not.a.jwt' }],
  ])('returns 401 UNAUTHORIZED with %s', async (_, headers) => {
    const res = await request(app).get('/api/auth/me').set(headers);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when the user no longer exists', async () => {
    const student = await createStudent();
    const headers = bearer(student);
    await User.deleteOne({ _id: student._id });
    const res = await request(app).get('/api/auth/me').set(headers);
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired token', async () => {
    const student = await createStudent();
    const expired = jwt.sign({ sub: student._id.toString(), role: 'student' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${expired}` });
    expect(res.status).toBe(401);
  });
});
