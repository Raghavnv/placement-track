const { z } = require('zod');
const mongoose = require('mongoose');

const refresh = z.boolean().default(false); // true = ask the AI again instead of reusing the saved answer

const review = z.object({ refresh });

// An outside job is sent by the client (jobs aren't stored); a drive is looked up by id.
const job = z.object({
  id: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(200),
  company: z.string().trim().max(120).default(''),
  location: z.string().trim().max(120).default(''),
  description: z.string().trim().max(2000).default(''),
  skills: z.array(z.string().trim().max(40)).max(30).default([]),
});

const fit = z
  .object({
    driveId: z.string().trim().refine((v) => mongoose.isValidObjectId(v), 'Invalid drive').optional(),
    job: job.optional(),
    refresh,
  })
  .refine((body) => Boolean(body.driveId) !== Boolean(body.job), { message: 'Send either driveId or job', path: ['driveId'] });

module.exports = { review, fit };
