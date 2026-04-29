const express = require('express');
const router = express.Router();
const { getViolationAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.get('/violations', protect, getViolationAnalytics);

module.exports = router;
