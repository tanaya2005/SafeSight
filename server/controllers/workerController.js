const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const cloudinary = require('cloudinary').v2;
const Worker = require('../models/Worker');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Generate a unique WRK-XXXXXX ID.
 * Collides are extremely unlikely (900 000 possibilities) but we retry anyway.
 */
const generateWorkerId = () => {
  const num = Math.floor(100000 + Math.random() * 900000); // 6-digit
  return `WRK-${num}`;
};

/**
 * Ensure the qrcodes directory exists, then write the QR image.
 * Returns the file path relative to the server root (used as URL path).
 */
const generateQRImage = async (workerId, qrData) => {
  const dir = path.join(__dirname, '..', 'uploads', 'qrcodes');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = `${workerId}.png`;
  const filepath = path.join(dir, filename);

  await QRCode.toFile(filepath, qrData, {
    color: {
      dark: '#0f172a',  // dark squares
      light: '#ffffff', // white background
    },
    width: 300,
    margin: 2,
  });

  return `/uploads/qrcodes/${filename}`;
};

// ΓöÇΓöÇΓöÇ Controllers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

// @desc    Get all workers
// @route   GET /api/workers
// @access  Private
const getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    res.json({ success: true, count: workers.length, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get workers currently inside the facility
// @route   GET /api/workers/inside
// @access  Private
const getWorkersInside = async (req, res) => {
  try {
    const workers = await Worker.find({ isInside: true });
    res.json({ success: true, count: workers.length, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single worker by MongoDB ID
// @route   GET /api/workers/:id
// @access  Private
const getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    res.json({ success: true, data: worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get worker by QR code / workerId
// @route   GET /api/workers/qr/:qrCode
// @access  Private
const getWorkerByQR = async (req, res) => {
  try {
    const code = req.params.qrCode;
    // Support both legacy qrCode field and new workerId field
    const worker = await Worker.findOne({
      $or: [{ qrCode: code }, { workerId: code }],
    });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found for this QR code' });
    }
    res.json({ success: true, data: worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a worker + auto-generate QR code
// @route   POST /api/workers/create   (or POST /api/workers for backward compat)
// @access  Private
const createWorker = async (req, res) => {
  try {
    const { name, role, photo, authorizedZones } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Worker name is required' });
    }

    // Generate unique workerId (retry up to 5 times on unlikely collision)
    let workerId;
    let attempts = 0;
    while (attempts < 5) {
      const candidate = generateWorkerId();
      const exists = await Worker.findOne({ workerId: candidate });
      if (!exists) { workerId = candidate; break; }
      attempts++;
    }
    if (!workerId) {
      return res.status(500).json({ success: false, message: 'Could not generate unique worker ID' });
    }

    // Build JSON payload stored inside the QR
    const qrPayload = {
      workerId,
      name: name.trim(),
      role: role || 'General',
    };
    const qrData = JSON.stringify(qrPayload);

    // Generate and save QR image
    const qrImage = await generateQRImage(workerId, qrData);

    const worker = await Worker.create({
      name: name.trim(),
      role: role || 'General',
      workerId,
      qrData,
      qrImage,
      // Keep qrCode field = workerId for backward compat with scan endpoints
      qrCode: workerId,
      photo: photo || '',
      authorizedZones: authorizedZones || [],
    });

    res.status(201).json({
      success: true,
      data: worker,
      workerId: worker.workerId,
      qrImage: worker.qrImage,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Worker ID conflict, please try again' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update worker
// @route   PUT /api/workers/:id
// @access  Private
const updateWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    res.json({ success: true, data: worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete worker
// @route   DELETE /api/workers/:id
// @access  Private
const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Try to delete QR image file
    if (worker.workerId) {
      const imgPath = path.join(__dirname, '..', 'uploads', 'qrcodes', `${worker.workerId}.png`);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    res.json({ success: true, message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload worker photo to Cloudinary
// @route   POST /api/workers/upload
// @access  Private
const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo provided' });
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'safe-sight/workers',
      resource_type: 'image'
    });

    res.json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photo to Cloudinary' });
  }
};

// @desc    Get worker faces for AI engine
// @route   GET /api/workers/faces
// @access  Public
const getWorkerFaces = async (req, res) => {
  try {
    const workers = await Worker.find({ photo: { $ne: '' } });
    const faces = workers.map(w => ({
      workerId: w.workerId,
      name: w.name,
      faceImageUrl: w.photo
    }));
    res.json(faces);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWorkers,
  getWorkersInside,
  getWorkerById,
  getWorkerByQR,
  createWorker,
  updateWorker,
  deleteWorker,
  getWorkerFaces,
  uploadPhoto,
};
