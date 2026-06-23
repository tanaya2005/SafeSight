const express = require('express');
const router = express.Router();
const ppeConfigController = require('../controllers/ppeConfigController');
const { protect } = require('../middleware/auth');

// Public endpoint for AI engine to fetch enabled configs
router.get('/enabled', ppeConfigController.getEnabledConfigs);

// All other routes require authentication
router.use(protect);

// GET /api/ppe-config - Get all PPE configurations
router.get('/', ppeConfigController.getAllConfigs);

// POST /api/ppe-config - Create new PPE configuration
router.post('/', ppeConfigController.createConfig);

// PUT /api/ppe-config/:id - Update PPE configuration
router.put('/:id', ppeConfigController.updateConfig);

// PATCH /api/ppe-config/:id/toggle - Toggle enabled status
router.patch('/:id/toggle', ppeConfigController.toggleEnabled);

// DELETE /api/ppe-config/:id - Delete PPE configuration
router.delete('/:id', ppeConfigController.deleteConfig);

// POST /api/ppe-config/:id/training-image - Add training image
router.post('/:id/training-image', ppeConfigController.addTrainingImage);

module.exports = router;
