const router = require('express').Router();
const builder = require('../controllers/resumeBuilderController');
const schemas = require('../validators/resumeBuilderSchemas');
const { validate } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect, requireRole('student'));

// Resume builder: a saved draft, its PDF, and "use as my resume".
router.route('/').get(builder.getDraft).put(validate(schemas.draft), builder.saveDraft);
router.get('/pdf', builder.downloadPdf);
router.post('/use', builder.useAsResume);

module.exports = router;
