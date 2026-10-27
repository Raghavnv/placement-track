const router = require('express').Router();
const applications = require('../controllers/applicationController');
const schemas = require('../validators/applicationSchemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

// "/me..." routes must come before "/:id".
router.get('/me', requireRole('student'), applications.myApplications);
router.get('/me/reminders', requireRole('student'), validate(schemas.remindersQuery, 'query'), applications.reminders);
router.get('/me/calendar.ics', requireRole('student'), applications.calendar);

router.get('/:id', validateObjectId(), applications.getApplication);
router.patch('/:id/stage', validateObjectId(), requireRole('admin'), validate(schemas.stageUpdate), applications.updateStage);
router.patch('/:id/notes', validateObjectId(), requireRole('student'), validate(schemas.notesUpdate), applications.updateNotes);

module.exports = router;
