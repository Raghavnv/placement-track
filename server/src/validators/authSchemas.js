const { z } = require('zod');
const { BRANCHES } = require('../utils/constants');

const email = z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Email is invalid');

const register = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
  rollNumber: z.string({ required_error: 'Roll number is required' }).trim().toUpperCase().min(3).max(20),
  branch: z.enum(BRANCHES, { errorMap: () => ({ message: `Branch must be one of ${BRANCHES.join(', ')}` }) }),
  cgpa: z.coerce.number({ invalid_type_error: 'CGPA must be a number' }).min(0).max(10, 'CGPA must be between 0 and 10'),
  backlogs: z.coerce.number().int().min(0).default(0),
  graduationYear: z.coerce.number().int().min(2020).max(2035),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Phone must be 10 digits')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
// Unknown keys such as "role" are stripped, so nobody can register as admin.

const login = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

module.exports = { register, login };
