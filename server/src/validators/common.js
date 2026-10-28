const { z } = require('zod');

// Query strings arrive as text; treat "?stage=" the same as leaving the parameter out.
const optionalQuery = (schema) => z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};

const searchText = optionalQuery(z.string().trim().max(100));

module.exports = { optionalQuery, pagination, searchText };
