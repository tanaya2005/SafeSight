const mongoose = require('mongoose');
const Violation = require('../models/Violation');
const Worker = require('../models/Worker');
require('dotenv').config();

const seedViolations = async () => {
  try {
    console.log('🌱 Starting violation seed...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safesight');
    console.log('✅ Connected to MongoDB');

    // Get existing workers
    const workers = await Worker.find().limit(10);
    console.log(`📋 Found ${workers.length} workers in database`);

    const violations = [];
    const types = [
      'No Helmet',
      'No Vest',
      'No Goggles',
      'No Boots',
      'Restricted Zone Entry'
    ];
    const cameras = ['CAM-1', 'CAM-2', 'CAM-3', 'CAM-4'];
    
    // Generate 60 random violations over the last 30 days
    for (let i = 0; i < 60; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      // Set random hour (6 AM to 10 PM for realistic work hours)
      const hour = 6 + Math.floor(Math.random() * 16);
      date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      
      const violationType = types[Math.floor(Math.random() * types.length)];
      const cameraId = cameras[Math.floor(Math.random() * cameras.length)];
      
      // Randomly assign to a worker (70% chance) or leave as unknown
      let workerId = null;
      let workerDescription = 'Unknown worker';
      
      if (workers.length > 0 && Math.random() > 0.3) {
        const worker = workers[Math.floor(Math.random() * workers.length)];
        workerId = worker._id;
        workerDescription = worker.name;
      }
      
      violations.push({
        cameraId,
        violationType,
        workerDescription,
        confidence: 0.7 + Math.random() * 0.3, // 70-100% confidence
        workerId,
        createdAt: date,
        resolved: Math.random() > 0.8 // 20% chance of being resolved
      });
    }
    
    // Clear existing violations (optional - comment out if you want to keep existing data)
    // await Violation.deleteMany({});
    // console.log('🗑️  Cleared existing violations');
    
    // Insert new violations
    await Violation.insertMany(violations);
    console.log(`✅ Successfully seeded ${violations.length} violations`);
    
    // Show summary
    const summary = {
      total: violations.length,
      byType: {},
      byCamera: {},
      withWorkers: violations.filter(v => v.workerId).length
    };
    
    violations.forEach(v => {
      summary.byType[v.violationType] = (summary.byType[v.violationType] || 0) + 1;
      summary.byCamera[v.cameraId] = (summary.byCamera[v.cameraId] || 0) + 1;
    });
    
    console.log('\n📊 Seed Summary:');
    console.log(`   Total violations: ${summary.total}`);
    console.log(`   With worker IDs: ${summary.withWorkers}`);
    console.log('\n   By Type:');
    Object.entries(summary.byType).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    console.log('\n   By Camera:');
    Object.entries(summary.byCamera).forEach(([camera, count]) => {
      console.log(`     ${camera}: ${count}`);
    });
    
    console.log('\n✨ Seed complete! You can now view analytics at /analytics');
    
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
};

seedViolations();
