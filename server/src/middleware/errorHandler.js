const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const DUPLICATE_KEY_ERRORS = {
  email: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' },
  rollNumber: { code: 'ROLL_NUMBER_TAKEN', message: 'An account with this roll number already exists' },
  drive: { code: 'ALREADY_APPLIED', message: 'You have already applied to this drive' },
};

function normalise(err) {
  if (err instanceof ApiError) return err;

  if (err.type === 'entity.parse.failed') {
    return new ApiError(400, 'VALIDATION_ERROR', 'Request body is not valid JSON');
  }
  if (err.type === 'entity.too.large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }
  if (err.name === 'CastError') {
    return new ApiError(400, 'INVALID_ID', `Invalid ${err.path}`);
  }
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new ApiError(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields', details);
  }
  if (err.code === 11000) {
    // The compound {student, drive} index reports both keys; prefer the most specific match.
    const fields = Object.keys(err.keyPattern || {});
    const field = fields.find((f) => DUPLICATE_KEY_ERRORS[f]) || fields[0];
    const known = DUPLICATE_KEY_ERRORS[field] || { code: 'DUPLICATE', message: 'This record already exists' };
    return new ApiError(409, known.code, known.message, [{ field, message: known.message }]);
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const apiError = normalise(err);

  if (!apiError) {
    if (!env.isTest) console.error(err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
  }

  const body = { code: apiError.code, message: apiError.message };
  if (apiError.details?.length) body.details = apiError.details;
  return res.status(apiError.status).json({ error: body });
};
