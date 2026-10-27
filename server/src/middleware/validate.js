const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

// Validates req[source] against a zod schema and replaces it with the parsed (trimmed, coerced) value.
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || source,
      message: issue.message,
    }));
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields', details));
  }
  req[source] = result.data;
  return next();
};

const validateObjectId = (param = 'id') => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) {
    return next(new ApiError(400, 'INVALID_ID', `Invalid ${param}`));
  }
  return next();
};

module.exports = { validate, validateObjectId };
