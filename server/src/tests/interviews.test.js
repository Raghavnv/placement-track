const request = require('supertest');
const app = require('../app');
const env = require('../config/env');
const Resume = require('../models/Resume');
const { createStudent, createAdmin, createDrive, bearer } = require('./setup/factories');
const { makePdf } = require('./setup/pdf');

const QUESTIONS = {
  questions: [
    { kind: 'technical', focus: 'Spring Boot', difficulty: 'medium', question: 'How does Spring Boot auto-configuration decide which beans to create?', rubric: ['Conditional annotations', 'Classpath scanning', 'Overriding defaults'] },
    { kind: 'technical', focus: 'SQL indexing', difficulty: 'hard', question: 'A query on a 10 million row orders table is slow. How do you decide which index to add?', rubric: ['EXPLAIN plan', 'Selectivity', 'Write cost'] },
    { kind: 'scenario', focus: 'Debugging', difficulty: 'medium', question: 'Your REST API returns 500 errors only under load. Walk me through how you would find the cause.', rubric: ['Logs and metrics', 'Reproduce', 'Connection pool'] },
    { kind: 'project', focus: 'Canteen app', difficulty: 'medium', question: 'In your canteen app, why did you choose Flask, and what would you change to handle 10x users?', rubric: ['Justified choice', 'Scaling plan'] },
    { kind: 'behavioural', focus: 'Deadlines', difficulty: 'easy', question: 'Tell me about a time a teammate missed their part right before a deadline. What did you do?', rubric: ['STAR structure', 'Ownership'] },
    { kind: 'technical', focus: 'extra', difficulty: 'easy', question: 'A sixth question that should be dropped by the server.', rubric: [] },
  ],
};

const GRADES = {
  answers: [
    { score: 8, feedback: 'Good on conditionals.', strongAnswer: 'Mentions @ConditionalOnClass…' },
    { score: 14, feedback: 'Strong.', strongAnswer: 'EXPLAIN first…' },
    { score: 5, feedback: 'Partly there.', strongAnswer: 'Check the pool…' },
    { score: 9, feedback: 'Should not be used: unanswered.', strongAnswer: 'Justify Flask…' },
    { score: 6, feedback: 'Some structure.', strongAnswer: 'Use STAR…' },
  ],
  competencies: [
    { name: 'Java backend', score: 72, note: 'Knew auto-configuration' },
    { name: '', score: 50, note: 'dropped' },
    { name: 'Communication', score: 140, note: 'Clear' },
  ],
  summary: 'Knows the basics well.',
  recommendation: 'Borderline for this role today.',
  nextSteps: ['Practise SQL query plans', 'Prepare project trade-offs', 'Use STAR', 'extra'],
};

let fetchMock;
const groqReturns = (...contents) => {
  contents.forEach((content) =>
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) }),
  );
};
const prompt = (n) => JSON.parse(fetchMock.mock.calls[n][1].body).messages;

async function studentWithResume() {
  const student = await createStudent({ skills: ['Java', 'SQL'], preferredRoles: ['software'] });
  const data = makePdf([
    'Asha Rao. B.E. CSE, CGPA 8.4.',
    'Projects: Campus canteen app with Flask and React, 300 daily orders, deployed on AWS with Docker.',
    'Internship: Java developer intern at a fintech startup, built Spring Boot APIs with MySQL.',
    'Skills: Java, Spring Boot, SQL, Python, React, Git.',
  ]);
  await Resume.create({ student: student._id, data });
  student.resume = { fileName: 'r.pdf', mimeType: 'application/pdf', size: data.length, uploadedAt: new Date() };
  return student.save();
}

const start = (student, body) => request(app).post('/api/interviews').set(bearer(student)).send(body);
const answer = (student, id, index, text) => request(app).put(`/api/interviews/${id}/answers/${index}`).set(bearer(student)).send({ answer: text });

beforeEach(() => {
  env.groqApiKey = 'test-groq-key';
  fetchMock = jest.spyOn(global, 'fetch');
});

afterEach(() => jest.restoreAllMocks());

describe('AI mock interviews', () => {
  it('writes posting-specific questions pitched by package and hides the rubric', async () => {
    groqReturns(QUESTIONS);
    const admin = await createAdmin();
    const drive = await createDrive(admin, { companyName: 'Zoho', role: 'Backend Developer', package: 10, skills: ['Java', 'Spring Boot', 'SQL'], description: 'Build billing APIs.' });
    const student = await studentWithResume();

    const res = await start(student, { driveId: drive._id.toString() });

    expect(res.status).toBe(201);
    const [system, user] = prompt(0);
    expect(system.content).toContain('senior interviewer at Zoho');
    expect(system.content).toContain('"Backend Developer"');
    expect(system.content).toContain('well-paying product companies'); // 10 LPA = Dream tier
    expect(system.content).toContain('probe a specific project or experience from the resume');
    expect(user.content).toContain('Skills wanted: Java, Spring Boot, SQL');
    expect(user.content).toContain('Campus canteen app with Flask');

    const { interview } = res.body;
    expect(interview.target).toMatchObject({ kind: 'drive', title: 'Backend Developer at Zoho', level: 'Product-company level' });
    expect(interview.questions).toHaveLength(5);
    expect(interview.questions[0]).toEqual({
      kind: 'technical',
      focus: 'Spring Boot',
      difficulty: 'medium',
      question: 'How does Spring Boot auto-configuration decide which beans to create?',
      answer: '',
    });
  });

  it('pitches mass-recruiter roles lower and works without a resume', async () => {
    groqReturns(QUESTIONS);
    const admin = await createAdmin();
    const drive = await createDrive(admin, { role: 'Systems Engineer', package: 4 });
    const student = await createStudent();

    const res = await start(student, { driveId: drive._id.toString() });

    expect(res.body.interview.target.level).toBe('Mass-recruiter level');
    expect(prompt(0)[0].content).toContain('has not shared a resume');
    expect(prompt(0)[1].content).toContain('(No resume shared.)');
  });

  it('saves answers, grades strictly once, and reports a verdict', async () => {
    groqReturns(QUESTIONS, GRADES);
    const admin = await createAdmin();
    const drive = await createDrive(admin, { companyName: 'Zoho', role: 'Backend Developer', package: 10 });
    const student = await studentWithResume();
    const { body } = await start(student, { driveId: drive._id.toString() });
    const id = body.interview._id;

    await answer(student, id, 0, '  It uses @Conditional annotations on the classpath.  ');
    await answer(student, id, 1, 'Run EXPLAIN, check selectivity, weigh write cost.');
    await answer(student, id, 2, 'Check logs, then the DB connection pool.');
    await answer(student, id, 4, 'Situation: hackathon. Task… Action… Result…');
    const saved = await request(app).get(`/api/interviews/${id}`).set(bearer(student));
    expect(saved.body.interview.questions[0].answer).toBe('It uses @Conditional annotations on the classpath.');

    const res = await request(app).post(`/api/interviews/${id}/finish`).set(bearer(student));

    expect(res.status).toBe(200);
    const graded = prompt(1);
    expect(graded[0].content).toContain('Grade strictly');
    expect(graded[1].content).toContain('Rubric: EXPLAIN plan | Selectivity | Write cost');
    expect(graded[1].content).toContain("QUESTION 4 (project, Canteen app, medium)");
    expect(graded[1].content).toContain("Candidate's answer: (no answer)");

    const { interview } = res.body;
    expect(interview.status).toBe('completed');
    expect(interview.questions.map((q) => q.score)).toEqual([8, 10, 5, 0, 6]);
    expect(interview.questions[3].feedback).toContain('Not answered');
    expect(interview.questions[1].rubric).toEqual(['EXPLAIN plan', 'Selectivity', 'Write cost']);
    expect(interview.report).toMatchObject({
      overallScore: 58,
      verdict: 'borderline',
      verdictLabel: 'Borderline: could go either way',
      recommendation: 'Borderline for this role today.',
      answered: 4,
      competencies: [
        { name: 'Java backend', score: 72, note: 'Knew auto-configuration' },
        { name: 'Communication', score: 100, note: 'Clear' },
      ],
      nextSteps: ['Practise SQL query plans', 'Prepare project trade-offs', 'Use STAR'],
    });

    // Graded interviews are final: no more answers, and finishing again doesn't call the AI.
    expect((await answer(student, id, 0, 'changed')).status).toBe(409);
    await request(app).post(`/api/interviews/${id}/finish`).set(bearer(student));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('works for outside jobs and lists past interviews', async () => {
    groqReturns(QUESTIONS);
    const student = await createStudent();
    const job = { id: '4412', title: 'Data Analyst', company: 'Acme', description: 'SQL and Power BI dashboards', skills: ['SQL', 'Power BI'], salary: 20 };

    const res = await start(student, { job });
    expect(res.body.interview.target).toMatchObject({ kind: 'job', key: 'job:4412', title: 'Data Analyst at Acme', level: 'Top-tier level' });

    const list = await request(app).get('/api/interviews').set(bearer(student));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].target.title).toBe('Data Analyst at Acme');
  });

  it('guards finishing, ownership and bad AI output', async () => {
    groqReturns(QUESTIONS);
    const admin = await createAdmin();
    const drive = await createDrive(admin);
    const student = await createStudent();
    const { body } = await start(student, { driveId: drive._id.toString() });
    const id = body.interview._id;

    const empty = await request(app).post(`/api/interviews/${id}/finish`).set(bearer(student));
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('NO_ANSWERS');

    const other = await createStudent();
    expect((await request(app).get(`/api/interviews/${id}`).set(bearer(other))).status).toBe(404);
    expect((await answer(student, id, 7, 'x')).status).toBe(404);
    expect((await answer(student, id, 'abc', 'x')).status).toBe(400);
    expect((await request(app).get('/api/interviews').set(bearer(admin))).status).toBe(403);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    groqReturns({ questions: [{ question: 'Too short' }] });
    const bad = await start(student, { driveId: drive._id.toString() });
    expect(bad.status).toBe(502);
  });
});
