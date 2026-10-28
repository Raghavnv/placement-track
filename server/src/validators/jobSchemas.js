const { z } = require('zod');
const { MAX_PAGES } = require('../utils/adzuna');
const { optionalQuery, searchText } = require('./common');

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];

const listQuery = z.object({
  q: searchText,
  location: optionalQuery(z.string().trim().max(60)), // "anywhere" turns off the profile city
  jobType: optionalQuery(z.enum(JOB_TYPES, { errorMap: () => ({ message: `Job type must be one of ${JOB_TYPES.join(', ')}` }) })),
  minSalary: optionalQuery(z.coerce.number().min(0).max(200)), // LPA
  sort: z.enum(['match', 'date', 'salary']).default('match'),
  page: z.coerce.number().int().min(1).max(MAX_PAGES, `Only the first ${MAX_PAGES} pages are available`).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(12),
});

module.exports = { listQuery };
