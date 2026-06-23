/**
 * SafeSight – Database Seed Script
 * Run: node scripts/seed.js
 * Seeds sample workers into MongoDB for testing
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Worker = require('../models/Worker');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safesight');
  console.log('✅ Connected to MongoDB for seeding');
};

const sampleWorkers = [
  {
    name: 'Akhil Sharma',
    role: 'Welder',
    workerId: 'WRK-001',
    qrCode: 'WORKER_001',
    authorizedZones: ['Welding Zone'],
    isInside: false,
  },
  {
    name: 'Rahul Verma',
    role: 'Electrician',
    workerId: 'WRK-002',
    qrCode: 'WORKER_002',
    authorizedZones: ['Electrical Zone', 'Control Room'],
    isInside: false,
  },
  {
    name: 'Priya Nair',
    role: 'Operator',
    workerId: 'WRK-003',
    qrCode: 'WORKER_003',
    authorizedZones: ['Assembly Zone'],
    isInside: false,
  },
  {
    name: 'Sanjay Patil',
    role: 'Technician',
    workerId: 'WRK-004',
    qrCode: 'WORKER_004',
    authorizedZones: ['Maintenance Zone', 'Welding Zone'],
    isInside: false,
  },
  {
    name: 'Amit Kumar',
    role: 'Supervisor',
    workerId: 'WRK-005',
    qrCode: 'WORKER_005',
    authorizedZones: ['All Zones'],
    isInside: false,
  },
];

const seed = async () => {
  try {
    await connectDB();

    // Clear existing workers
    await Worker.deleteMany({});
    console.log('🗑️  Cleared existing workers');

    // Insert sample workers
    const inserted = await Worker.insertMany(sampleWorkers);
    console.log(`✅ Seeded ${inserted.length} workers:`);
    inserted.forEach((w) => console.log(`   - ${w.name} (${w.role}) | QR: ${w.qrCode}`));

    console.log('\n📋 QR Code Reference:');
    inserted.forEach((w) => console.log(`   ${w.qrCode} → ${w.name}`));

    await mongoose.disconnect();
    console.log('\n✅ Seeding complete. MongoDB disconnected.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seed();
