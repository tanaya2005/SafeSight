const mongoose = require('mongoose');

const ppeConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  required: {
    type: Boolean,
    default: true,
  },
  category: {
    type: String,
    enum: ['head', 'eye', 'hand', 'body', 'foot', 'custom'],
    default: 'custom',
  },
  icon: {
    type: String,
    default: '🦺',
  },
  modelClassId: {
    type: Number,
    required: false,
  },
  trainingImages: [{
    url: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

ppeConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PPEConfig', ppeConfigSchema);
