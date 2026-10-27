const router = require('express').Router();
const admin = require('../controllers/adminController');
const resume = require('../controllers/resumeController');
const { statsQuery } = require('../validators/applicationSchemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect, requireRole('admin'));

router.get('/stats', validate(statsQuery, 'query'), admin.stats);
router.get('/students/:id/resume', validateObjectId(), resume.downloadStudentResume);

module.exports = router;
