const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');
const User = require('../models/User');

// Requires a valid "Authorization: Bearer <JWT>" header and loads the user onto req.user.
const protect = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Please log in to continue');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Your session has expired. Please log in again.');
  }

  // Re-read the user so deleted accounts and role changes take effect immediately.
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Your session has expired. Please log in again.');

  req.user = user;
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to do this'));
  }
  return next();
};

module.exports = { protect, requireRole };
