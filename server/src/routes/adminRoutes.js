const router = require('express').Router();
const admin = require('../controllers/adminController');
const resume = require('../controllers/resumeController');
const students = require('../controllers/studentController');
const report = require('../controllers/reportController');
const { studentsQuery } = require('../validators/studentSchemas');
const { statsQuery, calendarQuery } = require('../validators/applicationSchemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect, requireRole('admin'));

router.get('/stats', validate(statsQuery, 'query'), admin.stats);
router.get('/report', validate(statsQuery, 'query'), report.placementReport);
router.get('/calendar', validate(calendarQuery, 'query'), admin.calendar);
router.get('/students', validate(studentsQuery, 'query'), students.listStudents);
router.get('/students/:id', validateObjectId(), students.getStudent);
router.get('/students/:id/resume', validateObjectId(), resume.downloadStudentResume);

module.exports = router;
