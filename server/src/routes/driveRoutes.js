const router = require('express').Router();
const drives = require('../controllers/driveController');
const applications = require('../controllers/applicationController');
const { bulkStageUpdate } = require('../validators/applicationSchemas');
const schemas = require('../validators/driveSchemas');
const { validate, validateObjectId } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(validate(schemas.listQuery, 'query'), drives.listDrives)
  .post(requireRole('admin'), validate(schemas.createDrive), drives.createDrive);

router
  .route('/:id')
  .all(validateObjectId())
  .get(drives.getDrive)
  .put(requireRole('admin'), validate(schemas.updateDrive), drives.updateDrive)
  .delete(requireRole('admin'), drives.deleteDrive);

router.post('/:id/apply', validateObjectId(), requireRole('student'), drives.applyToDrive);
router.get(
  '/:id/applicants',
  validateObjectId(),
  requireRole('admin'),
  validate(schemas.applicantsQuery, 'query'),
  drives.getApplicants,
);

router.post(
  '/:id/applicants/stage',
  validateObjectId(),
  requireRole('admin'),
  validate(bulkStageUpdate),
  applications.bulkUpdateStage,
);

module.exports = router;
