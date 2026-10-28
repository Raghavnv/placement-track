const { z } = require('zod');
const mongoose = require('mongoose');
const { STAGES } = require('../utils/stages');
const { optionalQuery } = require('./common');

const stageUpdate = z.object({
  stage: z.enum(STAGES, { errorMap: () => ({ message: `Stage must be one of ${STAGES.join(', ')}` }) }),
  remark: z.string().trim().max(300, 'Remark must be at most 300 characters').default(''),
});

const MAX_BULK = 500;

// Move many applicants of one drive at once, picked by application id (ticked rows) or roll number (pasted list).
const bulkStageUpdate = stageUpdate
  .extend({
    applicationIds: z
      .array(z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid application id'))
      .min(1, 'Select at least one applicant')
      .max(MAX_BULK, `Move up to ${MAX_BULK} applicants at a time`)
      .optional(),
    rollNumbers: z
      .array(z.string().trim().toUpperCase().max(20))
      .max(MAX_BULK, `Paste up to ${MAX_BULK} roll numbers at a time`)
      .transform((list) => [...new Set(list.filter(Boolean))])
      .refine((list) => list.length > 0, 'Paste at least one roll number')
      .optional(),
  })
  .refine((body) => Boolean(body.applicationIds) !== Boolean(body.rollNumbers), {
    path: ['applicationIds'],
    message: 'Send either applicationIds or rollNumbers',
  });

// Which applicants' resumes to zip: ticked rows, everyone at a stage, or (neither) every applicant.
const resumeZip = z
  .object({
    applicationIds: z
      .array(z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid application id'))
      .min(1, 'Select at least one applicant')
      .max(MAX_BULK, `Download up to ${MAX_BULK} resumes at a time`)
      .optional(),
    stage: z.enum(STAGES, { errorMap: () => ({ message: `Stage must be one of ${STAGES.join(', ')}` }) }).optional(),
  })
  .refine((body) => !(body.applicationIds && body.stage), { path: ['stage'], message: 'Send applicationIds or stage, not both' });

const notesUpdate = z.object({
  notes: z.string({ required_error: 'Notes are required (send an empty string to clear)' }).max(5000, 'Notes must be at most 5000 characters'),
});

const remindersQuery = z.object({
  days: optionalQuery(z.coerce.number().int().min(1).max(30)).default(7),
});

const statsQuery = z.object({
  graduationYear: optionalQuery(z.coerce.number().int().min(2020).max(2035)),
});

const DAY_MS = 24 * 60 * 60 * 1000;
const calendarQuery = z
  .object({ from: z.coerce.date({ invalid_type_error: 'from must be a date' }), to: z.coerce.date({ invalid_type_error: 'to must be a date' }) })
  .refine((q) => q.to > q.from, { path: ['to'], message: 'to must be after from' })
  .refine((q) => q.to - q.from <= 62 * DAY_MS, { path: ['to'], message: 'Ask for at most 62 days at a time' });

module.exports = { calendarQuery, stageUpdate, bulkStageUpdate, resumeZip, notesUpdate, remindersQuery, statsQuery };
