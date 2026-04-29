const Violation = require('../models/Violation');
const Worker = require('../models/Worker');
const WorkerPPELog = require('../models/WorkerPPELog');

// @desc    Get analytics data for the last 30 days
// @route   GET /api/analytics/violations
// @access  Private
const getViolationAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    // Total violations in last 30 days
    const totalViolations = await Violation.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // This week violations
    const thisWeek = await Violation.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Last week violations (for comparison)
    const lastWeek = await Violation.countDocuments({
      createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
    });

    // Calculate week change percentage
    const weekChange = lastWeek > 0 ? (((thisWeek - lastWeek) / lastWeek) * 100).toFixed(1) : 0;

    // PPE violations (excluding zone violations)
    const ppeViolations = await Violation.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      violationType: { $ne: 'Restricted Zone Entry' }
    });

    // Zone violations
    const zoneViolations = await Violation.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      violationType: 'Restricted Zone Entry'
    });

    // Unique violators count
    const uniqueViolators = await Violation.distinct('workerId', {
      createdAt: { $gte: thirtyDaysAgo },
      workerId: { $ne: null }
    });

    // Violations by type
    const violationsByType = await Violation.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$violationType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Top violators (workers with most violations)
    const topViolators = await Violation.aggregate([
      { 
        $match: { 
          createdAt: { $gte: thirtyDaysAgo },
          workerId: { $ne: null }
        } 
      },
      { 
        $group: { 
          _id: '$workerId', 
          count: { $sum: 1 },
          lastViolation: { $max: '$createdAt' }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Populate worker names
    const topViolatorsWithNames = await Promise.all(
      topViolators.map(async (v) => {
        const worker = await Worker.findById(v._id).select('name role qrCode');
        return {
          workerId: worker ? worker.qrCode : v._id.toString(),
          name: worker ? worker.name : 'Unknown Worker',
          role: worker ? worker.role : 'N/A',
          count: v.count,
          lastViolation: v.lastViolation
        };
      })
    );

    // Violations over time (daily for last 30 days) - fill missing dates with 0
    const violationsOverTimeRaw = await Violation.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing dates with 0 violations
    const violationsOverTime = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const existing = violationsOverTimeRaw.find(v => v._id === dateStr);
      violationsOverTime.push({
        date: dateStr,
        count: existing ? existing.count : 0
      });
    }

    // Violations by camera
    const violationsByCamera = await Violation.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$cameraId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Violations by hour of day (0-23)
    const violationsByTimeOfDay = await Violation.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $project: {
          hour: { $hour: '$createdAt' }
        }
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format hour data for display
    const formattedTimeOfDay = violationsByTimeOfDay.map(v => ({
      hour: `${v._id}:00`,
      count: v.count
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalViolations,
          thisWeek,
          weekChange: parseFloat(weekChange),
          ppeViolations,
          uniqueViolators: uniqueViolators.length
        },
        violationsByType: violationsByType.map(v => ({
          type: v._id,
          count: v.count
        })),
        topViolators: topViolatorsWithNames,
        violationsOverTime,
        violationsByCamera: violationsByCamera.map(v => ({
          name: v._id,
          count: v.count
        })),
        violationsByTimeOfDay: formattedTimeOfDay
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getViolationAnalytics };
