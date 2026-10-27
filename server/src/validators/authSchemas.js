const { z } = require('zod');
const { BRANCHES, JOB_TYPES } = require('../utils/constants');
const { ROLE_KEYS, INTEREST_KEYS } = require('../utils/profileOptions');

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
  college: z.string({ required_error: 'College is required' }).trim().min(2, 'Enter your college name').max(120),
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

// Case-insensitive de-duplication for free-text lists such as skills.
const uniqueList = (item, max, label) =>
  z
    .array(item)
    .max(max, `Choose up to ${max} ${label}`)
    .transform((list) => {
      const seen = new Set();
      return list.filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

const updateProfile = z
  .object({
    college: z.string().trim().min(2, 'Enter your college name').max(120),
    phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be 10 digits').or(z.literal('')),
    skills: uniqueList(z.string().trim().min(1).max(40), 25, 'skills'),
    interests: uniqueList(z.enum(INTEREST_KEYS), 12, 'interests'),
    preferredRoles: uniqueList(z.enum(ROLE_KEYS), 5, 'roles'),
    preferredLocations: uniqueList(z.string().trim().min(1).max(40), 8, 'locations'),
    jobTypes: uniqueList(z.enum(JOB_TYPES), 2, 'job types'),
    expectedPackage: z.coerce.number().min(0).max(200).nullable(),
    needsOnboarding: z.literal(false),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Send at least one field to update' });

module.exports = { register, login, updateProfile };
