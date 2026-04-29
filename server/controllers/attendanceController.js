const Attendance = require('../models/Attendance');
const Worker = require('../models/Worker');

// ΓöÇΓöÇΓöÇ Internal helper: find worker by workerId / qrCode / JSON-encoded QR ΓöÇΓöÇΓöÇΓöÇΓöÇ
const findWorkerByCode = async (rawCode) => {
  let lookupId = rawCode;

  // If the scanned value is JSON (from html5-qrcode reading the QR image),
  // extract the workerId field.
  try {
    const parsed = JSON.parse(rawCode);
    if (parsed && parsed.workerId) {
      lookupId = parsed.workerId;
    }
  } catch (_) {
    // Not JSON ΓÇô treat as plain code
  }

  return Worker.findOne({
    $or: [{ workerId: lookupId }, { qrCode: lookupId }],
  });
};

// ΓöÇΓöÇΓöÇ In-memory Cooldown Cache ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Stores { workerId: lastScanTimestamp } to prevent rapid re-scanning
const scanCooldowns = new Map();
const COOLDOWN_MS = 60000; // 1 minute

// ΓöÇΓöÇΓöÇ Controllers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

// @desc    Universal QR scan ΓåÆ auto entry OR exit based on isInside flag
// @route   POST /api/attendance/scan
// @access  Public (called from entry terminal / mobile scanner)
const scanWorker = async (req, res) => {
  try {
    const { workerId: rawCode } = req.body;

    if (!rawCode) {
      return res.status(400).json({ success: false, message: 'workerId is required' });
    }

    const worker = await findWorkerByCode(rawCode);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found for this QR code' });
    }

    // ΓöÇΓöÇ Check Cooldown ΓöÇΓöÇ
    const now = Date.now();
    const workerKey = worker._id.toString();
    const lastScan = scanCooldowns.get(workerKey);

    if (lastScan && (now - lastScan < COOLDOWN_MS)) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before scanning again',
        action: 'cooldown'
      });
    }

    // Update cooldown timestamp
    scanCooldowns.set(workerKey, now);

    const io = req.app.get('io');

    if (!worker.isInside) {
      // ΓöÇΓöÇ ENTRY ΓöÇΓöÇ
      const attendance = await Attendance.create({
        workerId: worker._id,
        entryTime: new Date(),
      });

      worker.isInside = true;
      await worker.save();

      io.emit('worker_entry', { worker, attendance });

      return res.status(201).json({
        success: true,
        message: 'Entry recorded',
        action: 'entry',
        data: { worker, attendance },
      });
    } else {
      // ΓöÇΓöÇ EXIT ΓöÇΓöÇ
      const attendance = await Attendance.findOne({
        workerId: worker._id,
        exitTime: null,
      }).sort({ entryTime: -1 });

      if (!attendance) {
        return res.status(404).json({ success: false, message: 'No active attendance record found' });
      }

      attendance.exitTime = new Date();
      await attendance.save();

      worker.isInside = false;
      await worker.save();

      io.emit('worker_exit', { worker, attendance });

      return res.json({
        success: true,
        message: 'Exit recorded',
        action: 'exit',
        data: { worker, attendance },
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Worker entry ΓÇô scan QR to record entry
// @route   POST /api/attendance/entry
// @access  Public
const workerEntry = async (req, res) => {
  try {
    const { qrCode, photo } = req.body;

    const worker = await findWorkerByCode(qrCode);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found for this QR code' });
    }

    if (worker.isInside) {
      return res.status(400).json({ success: false, message: `${worker.name} is already inside the facility` });
    }

    const attendance = await Attendance.create({
      workerId: worker._id,
      entryTime: new Date(),
    });

    worker.isInside = true;
    if (photo) worker.photo = photo;
    await worker.save();

    const io = req.app.get('io');
    io.emit('worker_entry', { worker, attendance });

    res.status(201).json({
      success: true,
      message: `${worker.name} has entered the facility`,
      data: { worker, attendance },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Worker exit ΓÇô scan QR to record exit
// @route   POST /api/attendance/exit
// @access  Public
const workerExit = async (req, res) => {
  try {
    const { qrCode } = req.body;

    const worker = await findWorkerByCode(qrCode);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found for this QR code' });
    }

    if (!worker.isInside) {
      return res.status(400).json({ success: false, message: `${worker.name} is not currently inside` });
    }

    const attendance = await Attendance.findOne({
      workerId: worker._id,
      exitTime: null,
    }).sort({ entryTime: -1 });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'No active attendance record found' });
    }

    attendance.exitTime = new Date();
    await attendance.save();

    worker.isInside = false;
    await worker.save();

    const io = req.app.get('io');
    io.emit('worker_exit', { worker, attendance });

    res.json({
      success: true,
      message: `${worker.name} has exited the facility`,
      data: { worker, attendance },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate('workerId', 'name role photo workerId')
      .sort({ entryTime: -1 })
      .limit(100);

    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get today's attendance records
// @route   GET /api/attendance/today
// @access  Private
const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await Attendance.find({ date: today })
      .populate('workerId', 'name role photo workerId')
      .sort({ entryTime: -1 });

    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { scanWorker, workerEntry, workerExit, getAttendance, getTodayAttendance };
