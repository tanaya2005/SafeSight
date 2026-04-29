const WorkerPPELog = require('../models/WorkerPPELog');
const Worker = require('../models/Worker');

// Get or create today's log for a worker
const getTodayLog = async (workerId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let log = await WorkerPPELog.findOne({
    workerId,
    date: { $gte: today, $lt: tomorrow }
  });
  
  if (!log) {
    const worker = await Worker.findById(workerId);
    if (!worker) return null;
    
    log = new WorkerPPELog({
      workerId,
      workerName: worker.name,
      date: today,
    });
    await log.save();
  }
  
  return log;
};

// Log a PPE violation for a worker
exports.logViolation = async (req, res) => {
  try {
    const { workerId, violationType, cameraId, confidence, snapshot } = req.body;
    
    if (!workerId || !violationType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Worker ID and violation type are required' 
      });
    }
    
    const log = await getTodayLog(workerId);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    
    // Add violation
    log.ppeViolations.push({
      violationType,
      cameraId: cameraId || 'Unknown',
      confidence: confidence || 0.85,
      snapshot: snapshot || '',
      timestamp: new Date(),
    });
    
    // Update counts
    log.totalViolations = log.ppeViolations.length;
    
    // Update violation type counts
    const typeKey = violationType.toLowerCase().replace(/\s+/g, '');
    if (typeKey.includes('helmet')) log.violationsByType.noHelmet++;
    else if (typeKey.includes('vest')) log.violationsByType.noVest++;
    else if (typeKey.includes('glove')) log.violationsByType.noGloves++;
    else if (typeKey.includes('goggle')) log.violationsByType.noGoggles++;
    else if (typeKey.includes('boot')) log.violationsByType.noBoots++;
    
    await log.save();
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('worker_ppe_violation', { workerId, log });
    }
    
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get worker's PPE log for a specific date
exports.getWorkerLog = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { date } = req.query;
    
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const log = await WorkerPPELog.findOne({
      workerId,
      date: { $gte: queryDate, $lt: nextDay }
    }).populate('workerId', 'name role photo workerId');
    
    if (!log) {
      return res.json({ success: true, data: null, message: 'No log found for this date' });
    }
    
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get worker's PPE history (last N days)
exports.getWorkerHistory = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);
    
    const logs = await WorkerPPELog.find({
      workerId,
      date: { $gte: startDate }
    }).sort({ date: -1 }).populate('workerId', 'name role photo workerId');
    
    // Calculate statistics
    const stats = {
      totalDays: logs.length,
      totalViolations: logs.reduce((sum, log) => sum + log.totalViolations, 0),
      averageComplianceScore: logs.length > 0 
        ? logs.reduce((sum, log) => sum + log.complianceScore, 0) / logs.length 
        : 100,
      violationsByType: {
        noHelmet: logs.reduce((sum, log) => sum + log.violationsByType.noHelmet, 0),
        noVest: logs.reduce((sum, log) => sum + log.violationsByType.noVest, 0),
        noGloves: logs.reduce((sum, log) => sum + log.violationsByType.noGloves, 0),
        noGoggles: logs.reduce((sum, log) => sum + log.violationsByType.noGoggles, 0),
        noBoots: logs.reduce((sum, log) => sum + log.violationsByType.noBoots, 0),
      },
    };
    
    res.json({ success: true, data: { logs, stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all workers' compliance summary
exports.getAllWorkersCompliance = async (req, res) => {
  try {
    const { date } = req.query;
    
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const logs = await WorkerPPELog.find({
      date: { $gte: queryDate, $lt: nextDay }
    }).populate('workerId', 'name role photo workerId').sort({ complianceScore: 1 });
    
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark worker check-in (when QR scanned)
exports.checkIn = async (req, res) => {
  try {
    const { workerId } = req.body;
    
    const log = await getTodayLog(workerId);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    
    if (!log.checkedIn) {
      log.checkedIn = true;
      log.checkInTime = new Date();
      await log.save();
    }
    
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark worker check-out
exports.checkOut = async (req, res) => {
  try {
    const { workerId } = req.body;
    
    const log = await getTodayLog(workerId);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    
    log.checkOutTime = new Date();
    await log.save();
    
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
