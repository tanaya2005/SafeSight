const Violation = require('../models/Violation');

// @desc    Create a new PPE violation (called by AI Engine)
// @route   POST /api/violations
// @access  Public (AI Engine internal)
const createViolation = async (req, res) => {
  try {
    const { cameraId, violationType, workerDescription, confidence, snapshot, workerId } = req.body;

    let violation = null;
    let violationId = Date.now().toString();
    let timestamp = new Date();

    try {
      violation = await Violation.create({
        cameraId: cameraId || 'CAM-1',
        violationType: violationType || 'Unknown Violation',
        workerDescription: workerDescription || 'Unknown worker',
        confidence: confidence || 0.85,
        snapshot: snapshot || '',
        workerId: workerId || null,
      });
      violationId = violation._id;
      timestamp = violation.createdAt;
    } catch (dbErr) {
      console.warn(`[DB Warning] Failed to save PPE violation, but emitting socket event anyway: ${dbErr.message}`);
    }

    // Emit real-time socket alert to all dashboard clients
    const io = req.app.get('io');
    if (io) {
      io.emit('ppe_violation', {
        _id: violationId,
        cameraId: cameraId || 'CAM-1',
        violationType: violationType || 'Unknown Violation',
        workerDescription: workerDescription || 'Unknown worker',
        confidence: confidence || 0.85,
        timestamp: timestamp,
      });
    }

    console.log(`⚠️  PPE Violation active: ${violationType} on ${cameraId}`);
    res.status(201).json({ success: true, message: 'Violation recorded', data: violation });
  } catch (error) {
    console.error('API Error in createViolation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all violations (with optional filters)
// @route   GET /api/violations
// @access  Private
const getViolations = async (req, res) => {
  try {
    const { cameraId, resolved, limit = 100 } = req.query;
    const filter = {};
    if (cameraId) filter.cameraId = cameraId;
    if (resolved !== undefined) filter.resolved = resolved === 'true';

    const violations = await Violation.find(filter)
      .populate('workerId', 'name role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, count: violations.length, data: violations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get today's violations count
// @route   GET /api/violations/today
// @access  Private
const getTodayViolations = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await Violation.countDocuments({ createdAt: { $gte: today } });
    const violations = await Violation.find({ createdAt: { $gte: today } })
      .populate('workerId', 'name role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count, data: violations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark a violation as resolved
// @route   PATCH /api/violations/:id/resolve
// @access  Private
const resolveViolation = async (req, res) => {
  try {
    const violation = await Violation.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true }
    );

    if (!violation) {
      return res.status(404).json({ success: false, message: 'Violation not found' });
    }

    res.json({ success: true, message: 'Violation marked as resolved', data: violation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createViolation, getViolations, getTodayViolations, resolveViolation };
