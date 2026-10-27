const { z } = require('zod');
const { BRANCHES, JOB_TYPES, DRIVE_STATUSES } = require('../utils/constants');
const { STAGES } = require('../utils/stages');
const { optionalQuery, pagination, searchText } = require('./common');

const eligibilityFields = {
  minCgpa: z.coerce.number({ invalid_type_error: 'Minimum CGPA must be a number' }).min(0).max(10, 'Minimum CGPA must be between 0 and 10'),
  branches: z.array(z.enum(BRANCHES, { errorMap: () => ({ message: `Branches must be from ${BRANCHES.join(', ')}` }) })),
  graduationYear: z.coerce.number().int().min(2020).max(2035).nullable(),
  maxBacklogs: z.coerce.number().int().min(0).max(20),
};

const driveFields = {
  companyName: z.string({ required_error: 'Company name is required' }).trim().min(2, 'Company name must be at least 2 characters').max(100),
  role: z.string({ required_error: 'Role is required' }).trim().min(2, 'Role must be at least 2 characters').max(100),
  description: z.string().trim().max(2000),
  package: z.coerce.number({ required_error: 'Package is required', invalid_type_error: 'Package must be a number' })
    .positive('Package must be greater than 0')
    .max(200, 'Package looks too high (max 200 LPA)'),
  location: z.string().trim().max(100),
  jobType: z.enum(JOB_TYPES, { errorMap: () => ({ message: `Job type must be ${JOB_TYPES.join(' or ')}` }) }),
  deadline: z.coerce.date({ required_error: 'Deadline is required', invalid_type_error: 'Deadline must be a valid date' }),
  driveDate: z.coerce.date({ invalid_type_error: 'Drive date must be a valid date' }).nullable(),
  skills: z.array(z.string().trim().min(1).max(40)).max(15, 'Add up to 15 skills'),
};

const checkDates = (drive, ctx) => {
  if (drive.driveDate && drive.deadline && drive.driveDate < drive.deadline) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['driveDate'], message: 'Drive date must be on or after the deadline' });
  }
};

const createDrive = z
  .object({
    ...driveFields,
    description: driveFields.description.default(''),
    location: driveFields.location.default(''),
    skills: driveFields.skills.default([]),
    driveDate: driveFields.driveDate.optional().default(null),
    eligibility: z.object({
      minCgpa: eligibilityFields.minCgpa,
      branches: eligibilityFields.branches.default([]),
      graduationYear: eligibilityFields.graduationYear.optional().default(null),
      maxBacklogs: eligibilityFields.maxBacklogs.default(0),
    }, { required_error: 'Eligibility is required' }),
  })
  .superRefine((drive, ctx) => {
    if (drive.deadline <= new Date()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deadline'], message: 'Deadline must be in the future' });
    }
    checkDates(drive, ctx);
  });

// Every field optional; the deadline may be in the past so old drives can be corrected.
const updateDrive = z
  .object({
    ...driveFields,
    eligibility: z.object(eligibilityFields).partial(),
    status: z.enum(DRIVE_STATUSES),
  })
  .partial()
  .superRefine((drive, ctx) => {
    if (Object.keys(drive).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [], message: 'Send at least one field to update' });
    }
    checkDates(drive, ctx);
  });

const listQuery = z.object({
  status: optionalQuery(z.enum(['open', 'closed', 'all'])),
  search: searchText,
  jobType: optionalQuery(z.enum(JOB_TYPES)),
  minPackage: optionalQuery(z.coerce.number().min(0)),
  eligibleOnly: optionalQuery(z.enum(['true', 'false']).transform((v) => v === 'true')),
  sort: optionalQuery(z.enum(['deadline', '-createdAt', '-package', 'match'])).default('deadline'),
  ...pagination,
});

const applicantsQuery = z.object({
  stage: optionalQuery(z.enum(STAGES)),
  search: searchText,
  ...pagination,
});

module.exports = { createDrive, updateDrive, listQuery, applicantsQuery };
