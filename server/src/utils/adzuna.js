const env = require('../config/env');
const ApiError = require('./ApiError');
const JobSearchCache = require('../models/JobSearchCache');

// Adzuna job search API: https://developer.adzuna.com/docs/search
const BASE_URL = 'https://api.adzuna.com/v1/api/jobs';
const TIMEOUT_MS = 10000;
const MAX_DAYS_OLD = 30;
const MAX_PAGES = 10; // Adzuna stops returning results a few hundred in, and nobody pages that far
const LPA = 100000; // Adzuna India salaries are rupees per year

const isConfigured = () => Boolean(env.adzunaAppId && env.adzunaAppKey);

const toLpa = (rupees) => (rupees > 0 ? Math.round((rupees / LPA) * 10) / 10 : null);
const stripHtml = (text) => String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

function jobType(result) {
  if (/\bintern(ship)?\b/i.test(result.title)) return 'internship';
  if (result.contract_time === 'part_time') return 'part-time';
  if (result.contract_type === 'contract') return 'contract';
  return 'full-time';
}

// One Adzuna result in our own shape, so the client never depends on Adzuna's field names.
function toJob(result) {
  return {
    id: String(result.id),
    title: stripHtml(result.title),
    company: result.company?.display_name || 'Company not listed',
    location: result.location?.display_name || '',
    area: result.location?.area || [],
    description: stripHtml(result.description),
    category: result.category?.label || '',
    url: result.redirect_url,
    postedAt: result.created,
    salaryMin: toLpa(result.salary_min),
    salaryMax: toLpa(result.salary_max),
    salaryIsEstimate: String(result.salary_is_predicted) === '1',
    jobType: jobType(result),
  };
}

const CONTRACT_FLAGS = { 'full-time': 'full_time', 'part-time': 'part_time', contract: 'contract' };

function buildParams({ what, where, jobType: type, minSalary, sort, page, limit }) {
  const params = { results_per_page: limit, max_days_old: MAX_DAYS_OLD, sort_by: sort };
  const words = [what, type === 'internship' && 'internship'].filter(Boolean).join(' ');
  if (words) params.what = words;
  if (where) params.where = where;
  if (minSalary) params.salary_min = Math.round(minSalary * LPA);
  if (CONTRACT_FLAGS[type]) params[CONTRACT_FLAGS[type]] = 1;
  return { page, params };
}

async function fetchFromAdzuna(page, params) {
  const query = new URLSearchParams({ app_id: env.adzunaAppId, app_key: env.adzunaAppKey, ...params });
  const url = `${BASE_URL}/${env.adzunaCountry}/search/${page}?${query}`;

  let response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    console.error(`Adzuna request failed: ${error.message}`);
    throw new ApiError(502, 'JOBS_PROVIDER_ERROR', "Couldn't reach the job listings service. Please try again in a bit.");
  }
  if (!response.ok) {
    // 401 means ADZUNA_APP_ID / ADZUNA_APP_KEY are wrong; 429 means the monthly quota is used up.
    console.error(`Adzuna responded ${response.status}`);
    throw new ApiError(502, 'JOBS_PROVIDER_ERROR', "Couldn't load job listings right now. Please try again in a bit.");
  }
  const body = await response.json();
  return { count: body.count || 0, results: (body.results || []).map(toJob) };
}

// Searches Adzuna, reusing a cached response for the same search when there is one.
async function searchJobs(options) {
  const { page, params } = buildParams(options);
  const key = JSON.stringify({ country: env.adzunaCountry, page, ...params });

  const cached = await JobSearchCache.findOne({ key }).lean();
  if (cached) return cached.response;

  const response = await fetchFromAdzuna(page, params);
  try {
    await JobSearchCache.create({ key, response });
  } catch (error) {
    if (error.code !== 11000) throw error; // another request cached the same search first
  }
  return response;
}

module.exports = { MAX_PAGES, isConfigured, searchJobs, toJob };
