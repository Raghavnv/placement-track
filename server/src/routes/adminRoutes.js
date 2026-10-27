const router = require('express').Router();
const admin = require('../controllers/adminController');
const { statsQuery } = require('../validators/applicationSchemas');
const { validate } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect, requireRole('admin'));

router.get('/stats', validate(statsQuery, 'query'), admin.stats);

module.exports = router;
