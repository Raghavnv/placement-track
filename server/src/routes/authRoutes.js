const router = require('express').Router();
const auth = require('../controllers/authController');
const schemas = require('../validators/authSchemas');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/register', authLimiter, validate(schemas.register), auth.register);
router.post('/login', authLimiter, validate(schemas.login), auth.login);
router.get('/me', protect, auth.me);

module.exports = router;
