const router = require('express').Router();
const coach = require('../controllers/coachController');
const schemas = require('../validators/coachSchemas');
const { validate } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

router.use(protect, requireRole('student'));

// AI Resume Coach (Groq). GET returns the saved review without calling the AI.
router.get('/review', coach.getReview);
router.post('/review', aiLimiter, validate(schemas.review), coach.createReview);
router.post('/fit', aiLimiter, validate(schemas.fit), coach.fitCheck);

module.exports = router;
