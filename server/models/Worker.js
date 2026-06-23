const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Worker name is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Worker role is required'],
      enum: ['Welder', 'Electrician', 'Operator', 'Supervisor', 'Technician', 'General'],
      default: 'General',
    },
    // Human-readable unique ID like WRK-839274
    workerId: {
      type: String,
      unique: true,
      trim: true,
    },
    // JSON string encoded in the QR image
    qrData: {
      type: String,
      default: '',
    },
    // Backward-compatible alias still accepted on scan
    qrCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    // Path/URL to generated QR image
    qrImage: {
      type: String,
      default: '',
    },
    photo: {
      type: String,
      default: '',
    },
    isInside: {
      type: Boolean,
      default: false,
    },
    authorizedZones: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Worker', WorkerSchema);
