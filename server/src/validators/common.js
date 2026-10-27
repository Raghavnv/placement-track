const { z } = require('zod');

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};

const searchText = z.string().trim().max(100).optional();

module.exports = { pagination, searchText };
