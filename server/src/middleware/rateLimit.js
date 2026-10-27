const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Slows down password guessing on login/register.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (req, res, next) =>
    next(new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many attempts. Please wait a few minutes and try again.')),
});

module.exports = { authLimiter };
