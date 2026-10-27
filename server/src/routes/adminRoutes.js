const router = require('express').Router();
const admin = require('../controllers/adminController');
const resume = require('../controllers/resumeController');
const students = require('../controllers/studentController');
const { studentsQuery } = require('../validators/studentSchemas');
const { statsQuery } = require('../validators/applicationSchemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect, requireRole('admin'));

router.get('/stats', validate(statsQuery, 'query'), admin.stats);
router.get('/students', validate(studentsQuery, 'query'), students.listStudents);
router.get('/students/:id', validateObjectId(), students.getStudent);
router.get('/students/:id/resume', validateObjectId(), resume.downloadStudentResume);

module.exports = router;
