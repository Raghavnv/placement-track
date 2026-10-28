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

// Protects the Adzuna quota (~1,000 calls a month) from one student hammering search.
const jobsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (req, res, next) =>
    next(new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many job searches. Please wait a few minutes and try again.')),
});

// Protects the Groq free-tier limits; saved answers don't count against them.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (req, res, next) =>
    next(new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many coach requests. Please wait a few minutes and try again.')),
});

module.exports = { authLimiter, jobsLimiter, aiLimiter };
