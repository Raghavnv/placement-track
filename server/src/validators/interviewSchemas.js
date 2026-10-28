const { z } = require('zod');
const mongoose = require('mongoose');
const { job } = require('./coachSchemas');
const { optionalQuery, pagination } = require('./common');

const objectId = (label) => z.string().trim().refine((v) => mongoose.isValidObjectId(v), `Invalid ${label}`);

// Same target shape as "How do I fit?": a drive id, or an outside job sent by the client.
const start = z
  .object({ driveId: objectId('drive').optional(), job: job.optional() })
  .refine((body) => Boolean(body.driveId) !== Boolean(body.job), { message: 'Send either driveId or job', path: ['driveId'] });

const answer = z.object({
  answer: z.string({ required_error: 'Answer is required' }).max(4000, 'Keep answers under 4000 characters').transform((v) => v.trim()),
});

const answerParams = z.object({
  id: objectId('interview'),
  index: z.coerce.number().int().min(0).max(9),
});

const listQuery = z.object({ driveId: optionalQuery(objectId('drive')), ...pagination });

module.exports = { start, answer, answerParams, listQuery };
