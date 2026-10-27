const express = require('express');
const auth = require('../controllers/authController');
const resume = require('../controllers/resumeController');
const schemas = require('../validators/authSchemas');
const { validate } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { RESUME_MAX_BYTES } = require('../utils/resume');

const router = express.Router();

router.post('/register', authLimiter, validate(schemas.register), auth.register);
router.post('/login', authLimiter, validate(schemas.login), auth.login);
router.get('/me', protect, auth.me);
router.patch('/me', protect, requireRole('student'), validate(schemas.updateProfile), auth.updateProfile);

// The file is sent as the raw request body; its type is checked from the bytes, not the header.
router
  .route('/me/resume')
  .all(protect, requireRole('student'))
  .get(resume.downloadResume)
  .put(express.raw({ type: () => true, limit: RESUME_MAX_BYTES }), resume.uploadResume)
  .delete(resume.deleteResume);

module.exports = router;
