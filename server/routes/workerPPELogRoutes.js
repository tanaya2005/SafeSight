const express = require('express');
const router = express.Router();
const workerPPELogController = require('../controllers/workerPPELogController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// POST /api/worker-ppe-log/violation - Log a PPE violation
router.post('/violation', workerPPELogController.logViolation);

// POST /api/worker-ppe-log/check-in - Mark worker check-in
router.post('/check-in', workerPPELogController.checkIn);

// POST /api/worker-ppe-log/check-out - Mark worker check-out
router.post('/check-out', workerPPELogController.checkOut);

// GET /api/worker-ppe-log/worker/:workerId - Get worker's log for today or specific date
router.get('/worker/:workerId', workerPPELogController.getWorkerLog);

// GET /api/worker-ppe-log/worker/:workerId/history - Get worker's PPE history
router.get('/worker/:workerId/history', workerPPELogController.getWorkerHistory);

// GET /api/worker-ppe-log/compliance - Get all workers' compliance summary
router.get('/compliance', workerPPELogController.getAllWorkersCompliance);

module.exports = router;
