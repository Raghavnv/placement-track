const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, BRANCHES, JOB_TYPES } = require('../utils/constants');
const { ROLE_KEYS, INTEREST_KEYS } = require('../utils/profileOptions');

const SALT_ROUNDS = 10;

function isStudent() {
  return this.role === 'student';
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email is invalid'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'student', required: true },

    // Student-only profile, used for eligibility.
    rollNumber: { type: String, required: isStudent, uppercase: true, trim: true, unique: true, sparse: true },
    branch: { type: String, enum: BRANCHES, required: isStudent },
    cgpa: { type: Number, min: 0, max: 10, required: isStudent },
    backlogs: {
      type: Number,
      min: 0,
      default() {
        return this.role === 'student' ? 0 : undefined;
      },
    },
    graduationYear: { type: Number, min: 2020, max: 2035, required: isStudent },
    phone: { type: String, match: [/^\d{10}$/, 'Phone must be 10 digits'] },
    college: { type: String, trim: true, maxlength: 120 },

    // Onboarding answers, used for drive match scores.
    skills: { type: [{ type: String, trim: true, maxlength: 40 }], default: undefined },
    interests: { type: [{ type: String, enum: INTEREST_KEYS }], default: undefined },
    preferredRoles: { type: [{ type: String, enum: ROLE_KEYS }], default: undefined },
    preferredLocations: { type: [{ type: String, trim: true, maxlength: 40 }], default: undefined },
    jobTypes: { type: [{ type: String, enum: JOB_TYPES }], default: undefined },
    expectedPackage: { type: Number, min: 0, max: 200 },
    needsOnboarding: { type: Boolean },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1 });

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
