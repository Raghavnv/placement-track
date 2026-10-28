const { z } = require('zod');
const mongoose = require('mongoose');
const { RESULTS } = require('../models/Experience');
const { optionalQuery, pagination, searchText } = require('./common');

const thisYear = new Date().getFullYear();

const create = z.object({
  companyName: z.string({ required_error: 'Company is required' }).trim().min(2, 'Enter the company name').max(100),
  role: z.string({ required_error: 'Role is required' }).trim().min(2, 'Enter the role').max(100),
  driveId: z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid drive').nullable().optional(),
  year: z.coerce.number().int().min(2015).max(thisYear + 1),
  result: z.enum(RESULTS, { errorMap: () => ({ message: `Result must be one of ${RESULTS.join(', ')}` }) }),
  difficulty: z.coerce.number().int().min(1, 'Rate difficulty 1-5').max(5, 'Rate difficulty 1-5'),
  rounds: z
    .array(z.object({ name: z.string().trim().min(2, 'Name the round').max(80), details: z.string().trim().min(20, 'Describe the round in a sentence or two').max(1500) }))
    .min(1, 'Add at least one round')
    .max(8, 'Add at most 8 rounds'),
  tips: z.string().trim().max(1500).default(''),
  anonymous: z.boolean().default(false),
});

const listQuery = z.object({
  company: optionalQuery(z.string().trim().max(100)),
  search: searchText,
  ...pagination,
});

module.exports = { create, listQuery };
