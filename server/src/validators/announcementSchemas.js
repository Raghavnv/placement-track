const { z } = require('zod');
const mongoose = require('mongoose');
const { STAGES } = require('../utils/stages');
const { optionalQuery, pagination } = require('./common');

const objectId = (label) => z.string().trim().refine((v) => mongoose.isValidObjectId(v), `Invalid ${label}`);

const createAnnouncement = z
  .object({
    title: z.string({ required_error: 'Title is required' }).trim().min(3, 'Title must be at least 3 characters').max(120),
    message: z.string({ required_error: 'Message is required' }).trim().min(1, 'Write a message').max(2000),
    link: z
      .string()
      .trim()
      .max(500)
      .url('Link must be a full URL, e.g. https://…')
      .refine((v) => /^https?:\/\//i.test(v), 'Link must start with http:// or https://')
      .or(z.literal(''))
      .default(''),
    drive: objectId('drive').nullable().default(null),
    stages: z
      .array(z.enum(STAGES, { errorMap: () => ({ message: `Stages must be from ${STAGES.join(', ')}` }) }))
      .max(STAGES.length)
      .default([])
      .transform((list) => [...new Set(list)]),
  })
  .refine((body) => body.drive || body.stages.length === 0, {
    path: ['stages'],
    message: 'Pick a drive to send to applicants at a stage',
  });

const listQuery = z.object({
  drive: optionalQuery(objectId('drive')),
  ...pagination,
});

module.exports = { createAnnouncement, listQuery };
