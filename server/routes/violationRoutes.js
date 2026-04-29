const express = require('express');
const router = express.Router();
const {
  createViolation,
  getViolations,
  getTodayViolations,
  resolveViolation,
} = require('../controllers/violationController');
const { protect } = require('../middleware/auth');

// AI Engine posts violation alerts (no auth ΓÇô internal call)
router.post('/', createViolation);

// Dashboard reads violations (auth required)
router.get('/', protect, getViolations);
router.get('/today', protect, getTodayViolations);
router.patch('/:id/resolve', protect, resolveViolation);

module.exports = router;
