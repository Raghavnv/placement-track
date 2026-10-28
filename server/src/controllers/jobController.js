const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const adzuna = require('../utils/adzuna');
const { computeMatch } = require('../utils/matching');
const { extractSkills } = require('../utils/skills');

// What to search for each onboarding role when the student hasn't typed anything.
const ROLE_SEARCH = {
  software: 'software developer',
  web: 'web developer',
  data: 'data analyst',
  cloud: 'devops engineer',
  security: 'security analyst',
  consulting: 'business analyst',
  product: 'product designer',
  core: 'graduate engineer trainee',
  embedded: 'embedded engineer',
  finance: 'financial analyst',
};

// Listings say "Bangalore" or "Gurgaon"; onboarding uses these names.
const CITY_ALIASES = {
  Bengaluru: ['bengaluru', 'bangalore'],
  Hyderabad: ['hyderabad', 'secunderabad'],
  Chennai: ['chennai'],
  Pune: ['pune'],
  Mumbai: ['mumbai', 'bombay', 'thane'],
  'Delhi NCR': ['delhi', 'gurgaon', 'gurugram', 'noida', 'ghaziabad', 'faridabad'],
  Kolkata: ['kolkata', 'calcutta'],
};
const SEARCH_CITY = { 'Delhi NCR': 'Delhi' };
const NOT_A_CITY = ['remote', 'anywhere'];

// Search suggestions from the student's onboarding answers: their roles first, then top skills.
function suggestionsFor(student) {
  const roles = (student.preferredRoles || []).map((key) => ROLE_SEARCH[key]).filter(Boolean);
  return [...new Set([...roles, ...(student.skills || []).slice(0, 3)])];
}

function profileLocation(student) {
  const city = (student.preferredLocations || []).find((l) => !NOT_A_CITY.includes(l.toLowerCase()));
  return city ? SEARCH_CITY[city] || city : undefined;
}

// The location name computeMatch compares against the student's list.
function matchLocation(job) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  if (/\b(remote|work from home|wfh)\b/.test(text)) return 'Remote';
  const place = [job.location, ...job.area].join(' ').toLowerCase();
  const city = Object.keys(CITY_ALIASES).find((name) => CITY_ALIASES[name].some((alias) => place.includes(alias)));
  return city || job.location;
}

function salaryMidpoint({ salaryMin, salaryMax }) {
  if (salaryMin && salaryMax) return (salaryMin + salaryMax) / 2;
  return salaryMin || salaryMax || null;
}

// Scores an outside job with the same engine as campus drives, by giving it a drive's shape.
function decorate(job, student) {
  const skills = extractSkills(`${job.title} ${job.description} ${job.category}`, student.skills);
  const { score, reasons } = computeMatch(student, {
    role: job.title,
    description: job.description,
    skills,
    location: matchLocation(job),
    jobType: job.jobType,
    package: salaryMidpoint(job),
  });
  const { area, ...rest } = job;
  return { ...rest, skills, matchScore: score, matchReasons: reasons };
}

exports.searchJobs = asyncHandler(async (req, res) => {
  if (!adzuna.isConfigured()) {
    throw new ApiError(503, 'JOBS_NOT_CONFIGURED', "Job search isn't set up yet. The Adzuna API keys are missing on the server.");
  }

  const { q, location, jobType, minSalary, sort, page, limit } = req.query;
  const student = req.user;
  const suggestions = suggestionsFor(student);

  // No search typed: show jobs for the student's first goal, in their first preferred city.
  const forYou = !q;
  const what = q || suggestions[0];
  const where = location === 'anywhere' ? undefined : location || (forYou ? profileLocation(student) : undefined);

  const { count, results } = await adzuna.searchJobs({
    what,
    where,
    jobType,
    minSalary,
    sort: sort === 'date' || sort === 'salary' ? sort : 'relevance',
    page,
    limit,
  });

  const data = results.map((job) => decorate(job, student));
  // Best match ranks within the page: Adzuna decides which jobs are on it (by relevance).
  if (sort === 'match') data.sort((a, b) => b.matchScore - a.matchScore);

  res.json({
    data,
    pagination: { page, limit, total: count, totalPages: Math.min(Math.ceil(count / limit), adzuna.MAX_PAGES) },
    search: { mode: forYou ? 'for-you' : 'search', keywords: what || '', location: where || null, suggestions },
  });
});
