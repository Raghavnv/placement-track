const ApiError = require('../utils/ApiError');

module.exports = (req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
};
