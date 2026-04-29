const express = require('express');
const router = express.Router();
const {
  scanWorker,
  workerEntry,
  workerExit,
  getAttendance,
  getTodayAttendance,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');

// Universal scan endpoint (auto entry/exit)
router.post('/scan', scanWorker);          // No auth ΓÇô called from QR scanner / terminal

// Legacy separate entry/exit endpoints
router.post('/entry', workerEntry);        // No auth ΓÇô called from entry terminal
router.post('/exit', workerExit);          // No auth ΓÇô called from exit terminal

router.get('/', protect, getAttendance);
router.get('/today', protect, getTodayAttendance);

module.exports = router;
