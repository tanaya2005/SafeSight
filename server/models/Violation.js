const mongoose = require('mongoose');

/**
 * Violation ΓÇô stores PPE violation events sent by the AI Engine
 * Created when AI engine POSTs to /api/violations
 */
const ViolationSchema = new mongoose.Schema(
  {
    cameraId: {
      type: String,
      required: true,
      default: 'CAM-1',
    },
    violationType: {
      type: String,
      required: true,
      // e.g. 'No Helmet', 'No Vest', 'No Goggles', 'No Boots'
    },
    workerDescription: {
      type: String,
      default: 'Unknown worker',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.85,
    },
    // Optional: link to a known worker if identified
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      default: null,
    },
    // Snapshot image from AI engine (base64 or URL)
    snapshot: {
      type: String,
      default: '',
    },
    resolved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Violation', ViolationSchema);
