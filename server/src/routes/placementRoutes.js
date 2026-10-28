const router = require('express').Router();
const placement = require('../controllers/placementController');
const schemas = require('../validators/placementSchemas');
const { validate } = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

// Offer policy and drive tiers (Regular / Dream / Super Dream).
router.get('/policy', placement.getPolicy);
router.put('/policy', requireRole('admin'), validate(schemas.updatePolicy), placement.updatePolicy);
router.get('/me', requireRole('student'), placement.myPlacement);

module.exports = router;
