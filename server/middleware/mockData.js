/**
 * Mock Data Middleware
 * Provides sample data when MongoDB is unavailable
 */

const mongoose = require('mongoose');

// Check if MongoDB is connected
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Mock data store (in-memory)
const mockStore = {
  workers: [
    {
      _id: '1',
      workerId: 'WRK-123456',
      name: 'John Doe',
      role: 'Welder',
      isInside: true,
      photo: 'https://via.placeholder.com/150',
      qrCode: 'WRK-123456',
      authorizedZones: ['Welding Zone'],
      createdAt: new Date(),
    },
    {
      _id: '2',
      workerId: 'WRK-789012',
      name: 'Jane Smith',
      role: 'Supervisor',
      isInside: false,
      photo: 'https://via.placeholder.com/150',
      qrCode: 'WRK-789012',
      authorizedZones: ['All Zones'],
      createdAt: new Date(),
    },
  ],
  attendance: [
    {
      _id: '1',
      workerId: { _id: '1', name: 'John Doe', role: 'Welder', workerId: 'WRK-123456' },
      entryTime: new Date(),
      exitTime: null,
      date: new Date().toISOString().split('T')[0],
    },
  ],
  zones: [],
  violations: [
    {
      _id: '1',
      cameraId: 'CAM-1',
      violationType: 'No Helmet',
      confidence: 0.85,
      workerDescription: 'Worker without helmet detected',
      timestamp: new Date(),
      createdAt: new Date(),
    },
  ],
};

// Mock response helper
const mockResponse = (req, res, next) => {
  if (isMongoConnected()) {
    return next();
  }

  // Add mock methods to req object
  req.useMockData = true;
  req.mockStore = mockStore;

  next();
};

module.exports = { mockResponse, isMongoConnected, mockStore };
