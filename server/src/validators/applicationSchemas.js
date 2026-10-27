const { z } = require('zod');
const { STAGES } = require('../utils/stages');
const { optionalQuery } = require('./common');

const stageUpdate = z.object({
  stage: z.enum(STAGES, { errorMap: () => ({ message: `Stage must be one of ${STAGES.join(', ')}` }) }),
  remark: z.string().trim().max(300, 'Remark must be at most 300 characters').default(''),
});

const notesUpdate = z.object({
  notes: z.string({ required_error: 'Notes are required (send an empty string to clear)' }).max(5000, 'Notes must be at most 5000 characters'),
});

const remindersQuery = z.object({
  days: optionalQuery(z.coerce.number().int().min(1).max(30)).default(7),
});

const statsQuery = z.object({
  graduationYear: optionalQuery(z.coerce.number().int().min(2020).max(2035)),
});

module.exports = { stageUpdate, notesUpdate, remindersQuery, statsQuery };
