const env = require('./env');

const toRegex = (pattern) =>
  new RegExp(`^${pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^.]*')}$`);

const allowed = env.clientUrls.map(toRegex);

module.exports = {
  origin(origin, callback) {
    // Requests without an Origin header (curl, Postman, server-to-server) are allowed.
    if (!origin || allowed.some((rx) => rx.test(origin))) return callback(null, true);
    return callback(null, false);
  },
  exposedHeaders: ['Content-Disposition'],
};
