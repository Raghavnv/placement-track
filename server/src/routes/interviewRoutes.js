const router = require('express').Router();
const interviews = require('../controllers/interviewController');
const schemas = require('../validators/interviewSchemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

router.use(protect, requireRole('student'));

// AI mock interviews (Groq): questions from the posting, saved answers, one graded report.
router
  .route('/')
  .get(validate(schemas.listQuery, 'query'), interviews.listInterviews)
  .post(aiLimiter, validate(schemas.start), interviews.startInterview);
router.get('/:id', validateObjectId(), interviews.getInterview);
router.put('/:id/answers/:index', validate(schemas.answerParams, 'params'), validate(schemas.answer), interviews.saveAnswer);
router.post('/:id/finish', validateObjectId(), aiLimiter, interviews.finishInterview);

module.exports = router;
