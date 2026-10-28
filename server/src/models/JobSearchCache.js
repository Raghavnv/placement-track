const mongoose = require('mongoose');

// Adzuna responses, keyed by the exact search. The free tier is ~1,000 calls a month,
// so students with the same search share one call. MongoDB deletes entries after 6 hours.
const CACHE_SECONDS = 6 * 60 * 60;

const jobSearchCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  response: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: CACHE_SECONDS },
});

module.exports = mongoose.model('JobSearchCache', jobSearchCacheSchema);
