const mongoose = require('mongoose');

const ZoneAccessSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: [true, 'Worker ID is required'],
    },
    zoneName: {
      type: String,
      required: [true, 'Zone name is required'],
      trim: true,
    },
    entryTime: {
      type: Date,
      default: Date.now,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    approvedBySupervisor: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    ppeCompliant: {
      type: Boolean,
      default: false,
    },
    supervisorNote: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ZoneAccess', ZoneAccessSchema);
