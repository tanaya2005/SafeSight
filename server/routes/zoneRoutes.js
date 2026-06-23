const express = require('express');
const router = express.Router();
const {
  requestZoneAccess,
  approveZoneAccess,
  getZoneAccess,
  getActiveZoneAccess,
} = require('../controllers/zoneController');
const { protect } = require('../middleware/auth');

router.post('/request', requestZoneAccess);         // No auth – called from zone terminal
router.post('/approve', protect, approveZoneAccess); // Protected – supervisor only
router.get('/', protect, getZoneAccess);
router.get('/active', protect, getActiveZoneAccess);

module.exports = router;
