const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getWorkers,
  getWorkersInside,
  getWorkerById,
  getWorkerByQR,
  createWorker,
  updateWorker,
  deleteWorker,
  getWorkerFaces,
  uploadPhoto,
} = require('../controllers/workerController');
const { protect } = require('../middleware/auth');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', protect, getWorkers);
router.get('/inside', protect, getWorkersInside);
router.get('/faces', getWorkerFaces); // Public endpoint for AI engine
router.get('/qr/:qrCode', protect, getWorkerByQR);
router.get('/:id', protect, getWorkerById);

// Photo upload endpoint
router.post('/upload', protect, upload.single('photo'), uploadPhoto);

// Both /create (new) and / (existing) route to the same handler
router.post('/create', protect, createWorker);
router.post('/', protect, createWorker);

router.put('/:id', protect, updateWorker);
router.delete('/:id', protect, deleteWorker);

module.exports = router;
