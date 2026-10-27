const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const User = require('../models/User');

exports.register = asyncHandler(async (req, res) => {
  const { password, ...profile } = req.body;

  if (await User.exists({ email: profile.email })) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists', [
      { field: 'email', message: 'An account with this email already exists' },
    ]);
  }
  if (await User.exists({ rollNumber: profile.rollNumber })) {
    throw new ApiError(409, 'ROLL_NUMBER_TAKEN', 'An account with this roll number already exists', [
      { field: 'rollNumber', message: 'An account with this roll number already exists' },
    ]);
  }

  const user = await User.create({ ...profile, role: 'student', passwordHash: await User.hashPassword(password) });
  res.status(201).json({ token: signToken(user), user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  // Same message for unknown email and wrong password so accounts can't be discovered.
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  res.json({ token: signToken(user), user });
});

exports.me = (req, res) => {
  res.json({ user: req.user });
};
