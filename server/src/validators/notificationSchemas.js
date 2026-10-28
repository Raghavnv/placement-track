const { z } = require('zod');
const mongoose = require('mongoose');

const markRead = z.object({
  ids: z.array(z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid notification id')).max(100).optional(),
});

module.exports = { markRead };
