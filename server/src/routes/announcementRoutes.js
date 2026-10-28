const router = require('express').Router();
const announcements = require('../controllers/announcementController');
const schemas = require('../validators/announcementSchemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(validate(schemas.listQuery, 'query'), announcements.listAnnouncements)
  .post(requireRole('admin'), validate(schemas.createAnnouncement), announcements.createAnnouncement);

router.delete('/:id', validateObjectId(), requireRole('admin'), announcements.deleteAnnouncement);

module.exports = router;
