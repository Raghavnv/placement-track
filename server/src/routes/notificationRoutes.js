const router = require('express').Router();
const notifications = require('../controllers/notificationController');
const schemas = require('../validators/notificationSchemas');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');

router.use(protect);

// The bell: newest notifications and the unread count.
router.get('/', notifications.listNotifications);
router.post('/read', validate(schemas.markRead), notifications.markRead);

module.exports = router;
