const PPEConfig = require('../models/PPEConfig');

// Get all PPE configurations
exports.getAllConfigs = async (req, res) => {
  try {
    const configs = await PPEConfig.find().sort({ category: 1, name: 1 });
    res.json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get enabled PPE configurations only
exports.getEnabledConfigs = async (req, res) => {
  try {
    const configs = await PPEConfig.find({ enabled: true }).sort({ category: 1, name: 1 });
    res.json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new PPE configuration
exports.createConfig = async (req, res) => {
  try {
    const { name, displayName, category, icon, modelClassId, enabled, required } = req.body;
    
    const config = new PPEConfig({
      name: name.toLowerCase().replace(/\s+/g, '_'),
      displayName,
      category: category || 'custom',
      icon: icon || '🦺',
      modelClassId,
      enabled: enabled !== undefined ? enabled : true,
      required: required !== undefined ? required : true,
    });

    await config.save();
    
    // Emit socket event to notify all clients
    const io = req.app.get('io');
    if (io) {
      io.emit('ppe_config_updated', { action: 'created', config });
    }

    res.status(201).json({ success: true, data: config });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update PPE configuration
exports.updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const config = await PPEConfig.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({ success: false, message: 'PPE config not found' });
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('ppe_config_updated', { action: 'updated', config });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Toggle PPE enabled status
exports.toggleEnabled = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await PPEConfig.findById(id);
    
    if (!config) {
      return res.status(404).json({ success: false, message: 'PPE config not found' });
    }

    config.enabled = !config.enabled;
    config.updatedAt = Date.now();
    await config.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('ppe_config_updated', { action: 'toggled', config });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete PPE configuration
exports.deleteConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await PPEConfig.findByIdAndDelete(id);

    if (!config) {
      return res.status(404).json({ success: false, message: 'PPE config not found' });
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('ppe_config_updated', { action: 'deleted', configId: id });
    }

    res.json({ success: true, message: 'PPE config deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add training image to PPE config
exports.addTrainingImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    const config = await PPEConfig.findById(id);
    if (!config) {
      return res.status(404).json({ success: false, message: 'PPE config not found' });
    }

    config.trainingImages.push({ url: imageUrl });
    config.updatedAt = Date.now();
    await config.save();

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
