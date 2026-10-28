const router = require('express').Router();
const jobs = require('../controllers/jobController');
const schemas = require('../validators/jobSchemas');
const { validate } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');
const { jobsLimiter } = require('../middleware/rateLimit');

router.use(protect, requireRole('student'));

// Outside job listings from Adzuna (not campus drives).
router.get('/', jobsLimiter, validate(schemas.listQuery, 'query'), jobs.searchJobs);

module.exports = router;
