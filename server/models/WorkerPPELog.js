const mongoose = require('mongoose');

const workerPPELogSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
  },
  workerName: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  // Daily attendance check
  checkedIn: {
    type: Boolean,
    default: false,
  },
  checkInTime: {
    type: Date,
  },
  checkOutTime: {
    type: Date,
  },
  // PPE Compliance tracking
  ppeViolations: [{
    violationType: String,  // "No Helmet", "No Vest", etc.
    timestamp: { type: Date, default: Date.now },
    cameraId: String,
    confidence: Number,
    snapshot: String,  // Base64 image
  }],
  // Summary counts
  totalViolations: {
    type: Number,
    default: 0,
  },
  violationsByType: {
    noHelmet: { type: Number, default: 0 },
    noVest: { type: Number, default: 0 },
    noGloves: { type: Number, default: 0 },
    noGoggles: { type: Number, default: 0 },
    noBoots: { type: Number, default: 0 },
  },
  // Compliance score (0-100)
  complianceScore: {
    type: Number,
    default: 100,
  },
  // Notes
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Index for faster queries
workerPPELogSchema.index({ workerId: 1, date: 1 });
workerPPELogSchema.index({ date: 1 });

// Calculate compliance score before saving
workerPPELogSchema.pre('save', function(next) {
  if (this.totalViolations === 0) {
    this.complianceScore = 100;
  } else {
    // Reduce score based on violations (max 20 violations = 0 score)
    this.complianceScore = Math.max(0, 100 - (this.totalViolations * 5));
  }
  next();
});

module.exports = mongoose.model('WorkerPPELog', workerPPELogSchema);
