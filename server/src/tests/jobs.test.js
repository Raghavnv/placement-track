const request = require('supertest');
const app = require('../app');
const env = require('../config/env');
const { extractSkills } = require('../utils/skills');
const { createStudent, createAdmin, bearer } = require('./setup/factories');

const adzunaResult = (overrides = {}) => ({
  id: 4412,
  title: 'Junior <strong>React</strong> Developer',
  description: 'Build dashboards with React, Node.js and SQL. Hybrid, Bangalore office.',
  created: '2026-10-20T09:00:00Z',
  redirect_url: 'https://www.adzuna.in/land/ad/4412',
  company: { display_name: 'Acme Labs' },
  location: { display_name: 'Bangalore, Karnataka', area: ['India', 'Karnataka', 'Bangalore'] },
  category: { label: 'IT Jobs' },
  salary_min: 600000,
  salary_max: 900000,
  salary_is_predicted: '0',
  contract_time: 'full_time',
  ...overrides,
});

const weakFit = adzunaResult({
  id: 9001,
  title: 'Mechanical Design Engineer',
  description: 'SolidWorks and GD&T for automotive parts.',
  location: { display_name: 'Pune, Maharashtra', area: ['India', 'Maharashtra', 'Pune'] },
  salary_min: 300000,
  salary_max: 400000,
});

let fetchMock;
const respond = (body, status = 200) =>
  fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body });
const calledUrl = (n = 0) => new URL(fetchMock.mock.calls[n][0]);

const student = () =>
  createStudent({
    skills: ['React', 'SQL', 'Python'],
    preferredRoles: ['web'],
    interests: ['web'],
    preferredLocations: ['Bengaluru', 'Remote'],
    jobTypes: ['full-time'],
    expectedPackage: 6,
  });

const search = (user, query = {}) => request(app).get('/api/jobs').query(query).set(bearer(user));

beforeEach(() => {
  env.adzunaAppId = 'test-id';
  env.adzunaAppKey = 'test-key';
  fetchMock = jest.spyOn(global, 'fetch');
  respond({ count: 2, results: [weakFit, adzunaResult()] });
});

afterEach(() => jest.restoreAllMocks());

describe('GET /api/jobs', () => {
  it("searches the student's first goal in their city when nothing is typed", async () => {
    const res = await search(await student());

    expect(res.status).toBe(200);
    const url = calledUrl();
    expect(url.pathname).toBe('/v1/api/jobs/in/search/1');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      what: 'web developer',
      where: 'Bengaluru',
      sort_by: 'relevance',
      results_per_page: '12',
    });
    expect(res.body.search).toEqual({
      mode: 'for-you',
      keywords: 'web developer',
      location: 'Bengaluru',
      suggestions: ['web developer', 'React', 'SQL', 'Python'],
    });
  });

  it('returns jobs in our own shape, scored and ranked by match', async () => {
    const res = await search(await student());

    expect(res.body.data.map((j) => j.id)).toEqual(['4412', '9001']);
    const [job] = res.body.data;
    expect(job).toMatchObject({
      title: 'Junior React Developer',
      company: 'Acme Labs',
      location: 'Bangalore, Karnataka',
      url: 'https://www.adzuna.in/land/ad/4412',
      salaryMin: 6,
      salaryMax: 9,
      salaryIsEstimate: false,
      jobType: 'full-time',
      skills: ['React', 'SQL', 'Node.js'],
    });
    expect(job).not.toHaveProperty('area');
    expect(job.matchScore).toBeGreaterThan(res.body.data[1].matchScore);
    expect(job.matchReasons).toEqual(expect.arrayContaining(['2 of 3 skills match (React, SQL)', 'Bengaluru is on your list']));
    expect(res.body.pagination).toEqual({ page: 1, limit: 12, total: 2, totalPages: 1 });
    expect(JSON.stringify(res.body)).not.toContain('test-key');
  });

  it('passes typed searches and filters through to Adzuna', async () => {
    await search(await student(), { q: 'data analyst', location: 'Pune', jobType: 'internship', minSalary: 4, sort: 'date', page: 2 });

    expect(calledUrl().pathname).toBe('/v1/api/jobs/in/search/2');
    expect(Object.fromEntries(calledUrl().searchParams)).toMatchObject({
      what: 'data analyst internship',
      where: 'Pune',
      salary_min: '400000',
      sort_by: 'date',
    });
  });

  it('maps job types to Adzuna flags and drops the city for "anywhere"', async () => {
    await search(await student(), { q: 'devops', location: 'anywhere', jobType: 'part-time' });

    const params = calledUrl().searchParams;
    expect(params.get('part_time')).toBe('1');
    expect(params.has('where')).toBe(false);
  });

  it('reuses a cached response for the same search', async () => {
    const user = await student();
    await search(user, { q: 'react' });
    const again = await search(user, { q: 'react' });

    expect(again.status).toBe(200);
    expect(again.body.data).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caps pages and reports a friendly error when Adzuna fails', async () => {
    respond({ count: 5000, results: [adzunaResult()] });
    const ok = await search(await student(), { q: 'java' });
    expect(ok.body.pagination.totalPages).toBe(10);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    respond({ exception: 'AUTH_FAIL' }, 401);
    const failed = await search(await student(), { q: 'python' });
    expect(failed.status).toBe(502);
    expect(failed.body.error.code).toBe('JOBS_PROVIDER_ERROR');

    fetchMock.mockRejectedValue(new Error('timeout'));
    expect((await search(await student(), { q: 'go' })).status).toBe(502);
  });

  it('says job search is not set up when the keys are missing', async () => {
    env.adzunaAppKey = undefined;
    const res = await search(await student());

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('JOBS_NOT_CONFIGURED');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is for logged-in students only and validates filters', async () => {
    expect((await request(app).get('/api/jobs')).status).toBe(401);
    expect((await search(await createAdmin())).status).toBe(403);

    const res = await search(await student(), { jobType: 'freelance', page: 11 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toEqual(['jobType', 'page']);
  });
});

describe('extractSkills', () => {
  it('finds known and student skills without matching inside other words', () => {
    expect(extractSkills('Java backend with Spring Boot; some JavaScript', [])).toEqual(['Java', 'JavaScript', 'Spring Boot']);
    expect(extractSkills('C++ and C# services', [])).toEqual(['C++', 'C#']);
    expect(extractSkills('We use nodejs and html', ['HTML/CSS'])).toEqual(['HTML/CSS', 'Node.js']);
    expect(extractSkills('Let us go and rest', [])).toEqual([]);
  });
});
