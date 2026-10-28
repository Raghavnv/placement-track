const { z } = require('zod');
const { BRANCHES } = require('../utils/constants');
const { optionalQuery, pagination, searchText } = require('./common');

const studentsQuery = z.object({
  search: searchText,
  branch: optionalQuery(z.enum(BRANCHES)),
  graduationYear: optionalQuery(z.coerce.number().int().min(2020).max(2035)),
  minCgpa: optionalQuery(z.coerce.number().min(0).max(10)),
  status: optionalQuery(z.enum(['placed', 'unplaced'])),
  resume: optionalQuery(z.enum(['yes', 'no'])),
  sort: optionalQuery(z.enum(['rollNumber', 'name', '-cgpa', '-createdAt'])).default('rollNumber'),
  ...pagination,
});

module.exports = { studentsQuery };
