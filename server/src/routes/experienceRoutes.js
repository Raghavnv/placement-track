const router = require('express').Router();
const experiences = require('../controllers/experienceController');
const schemas = require('../validators/experienceSchemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

// Interview experiences: students write them; everyone logged in reads them; officers can remove any.
router
  .route('/')
  .get(validate(schemas.listQuery, 'query'), experiences.listExperiences)
  .post(requireRole('student'), validate(schemas.create), experiences.createExperience);
router.get('/companies', experiences.listCompanies);
router.delete('/:id', validateObjectId(), experiences.deleteExperience);

module.exports = router;
