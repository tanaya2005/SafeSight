const Attendance = require('../models/Attendance');
const Worker = require('../models/Worker');
const ZoneAccess = require('../models/ZoneAccess');
const Violation = require('../models/Violation');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalWorkersOnSite,
      workersInRestrictedZones,
      todayEntries,
      todayViolations,
      totalWorkers,
      pendingZoneRequests,
      todayZoneViolations,
    ] = await Promise.all([
      Worker.countDocuments({ isInside: true }),
      ZoneAccess.countDocuments({ approved: true, status: 'approved', exitTime: null }),
      Attendance.countDocuments({ entryTime: { $gte: today } }),
      Violation.countDocuments({ createdAt: { $gte: today } }),
      Worker.countDocuments(),
      ZoneAccess.countDocuments({ status: 'pending' }),
      Violation.countDocuments({ violationType: 'Restricted Zone Entry', createdAt: { $gte: today } }),
    ]);

    const frequentZoneResult = await Violation.aggregate([
      { $match: { violationType: 'Restricted Zone Entry' } },
      { $group: { _id: '$workerDescription', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const frequentZone = frequentZoneResult.length ? frequentZoneResult[0]._id : 'N/A';

    const frequentWorkerResult = await Violation.aggregate([
      { $match: { violationType: 'Restricted Zone Entry', workerId: { $ne: null } } },
      { $group: { _id: '$workerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    
    let frequentWorker = 'N/A';
    if (frequentWorkerResult.length) {
      const w = await Worker.findById(frequentWorkerResult[0]._id);
      if (w) frequentWorker = w.name;
    }

    res.json({
      success: true,
      data: {
        totalWorkersOnSite,
        totalWorkers,
        workersInRestrictedZones,
        todayEntries,
        todayViolations,
        pendingZoneRequests,
        zoneAnalytics: {
          todayZoneViolations,
          frequentZone,
          frequentWorker
        }
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
