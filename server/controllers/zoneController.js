const ZoneAccess = require('../models/ZoneAccess');
const Worker = require('../models/Worker');
const { isMongoConnected, mockStore } = require('../middleware/mockData');

// @desc    Request access to restricted zone
// @route   POST /api/zones/request
// @access  Private (Worker terminal)
const requestZoneAccess = async (req, res) => {
  try {
    const { qrCode, zoneName, ppeCompliant } = req.body;

    // Look up worker
    const worker = await Worker.findOne({ qrCode });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (!worker.isInside) {
      return res.status(400).json({ success: false, message: 'Worker is not checked in to the facility' });
    }

    // Create pending zone access request
    const zoneAccess = await ZoneAccess.create({
      workerId: worker._id,
      zoneName,
      ppeCompliant: ppeCompliant || false,
      status: 'pending',
    });

    await zoneAccess.populate('workerId', 'name role photo');

    // Emit real-time alert to supervisor dashboard
    const io = req.app.get('io');
    io.emit('zone_access_request', {
      requestId: zoneAccess._id,
      worker: { name: worker.name, role: worker.role, photo: worker.photo },
      zoneName,
      ppeCompliant: ppeCompliant || false,
      timestamp: zoneAccess.entryTime,
    });

    console.log(`🚨 Zone access request: ${worker.name} → ${zoneName}`);

    res.status(201).json({
      success: true,
      message: 'Zone access request submitted, awaiting supervisor approval',
      data: zoneAccess,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Supervisor approves/rejects zone access
// @route   POST /api/zones/approve
// @access  Private (Supervisor)
const approveZoneAccess = async (req, res) => {
  try {
    const { requestId, approved, note } = req.body;

    const zoneAccess = await ZoneAccess.findById(requestId).populate('workerId', 'name role');
    if (!zoneAccess) {
      return res.status(404).json({ success: false, message: 'Zone access request not found' });
    }

    zoneAccess.approvedBySupervisor = approved;
    zoneAccess.status = approved ? 'approved' : 'rejected';
    zoneAccess.supervisorNote = note || '';
    await zoneAccess.save();

    // Emit decision to terminal / worker
    const io = req.app.get('io');
    io.emit('zone_decision_result', {
      requestId,
      workerId: zoneAccess.workerId._id,
      workerName: zoneAccess.workerId.name,
      zoneName: zoneAccess.zoneName,
      approved,
      note: note || '',
    });

    res.json({
      success: true,
      message: `Access ${approved ? 'approved' : 'rejected'} for ${zoneAccess.workerId.name}`,
      data: zoneAccess,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all zone access records
// @route   GET /api/zones
// @access  Private
const getZoneAccess = async (req, res) => {
  try {
    // If MongoDB is not connected, return mock data
    if (!isMongoConnected()) {
      console.log('📊 Using mock data for zones (MongoDB unavailable)');
      return res.json({ 
        success: true, 
        count: mockStore.zones.length, 
        data: mockStore.zones 
      });
    }

    const records = await ZoneAccess.find()
      .populate('workerId', 'name role photo')
      .sort({ entryTime: -1 })
      .limit(50);

    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error('Error in getZoneAccess:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get active (pending/approved) zone access records
// @route   GET /api/zones/active
// @access  Private
const getActiveZoneAccess = async (req, res) => {
  try {
    // If MongoDB is not connected, return mock data
    if (!isMongoConnected()) {
      console.log('📊 Using mock data for active zones (MongoDB unavailable)');
      return res.json({ 
        success: true, 
        count: mockStore.zones.length, 
        data: mockStore.zones 
      });
    }

    const records = await ZoneAccess.find({ status: { $in: ['pending', 'approved'] } })
      .populate('workerId', 'name role photo')
      .sort({ entryTime: -1 });

    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error('Error in getActiveZoneAccess:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { requestZoneAccess, approveZoneAccess, getZoneAccess, getActiveZoneAccess };
