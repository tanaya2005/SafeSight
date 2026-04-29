require('dotenv').config();
const mongoose = require('mongoose');
const PPEConfig = require('../models/PPEConfig');

const defaultPPEItems = [
  {
    name: 'helmet',
    displayName: 'Safety Helmet',
    category: 'head',
    icon: '⛑️',
    modelClassId: 0,
    enabled: true,
    required: true,
  },
  {
    name: 'vest',
    displayName: 'Safety Vest',
    category: 'body',
    icon: '🦺',
    modelClassId: 2,
    enabled: true,
    required: true,
  },
  {
    name: 'gloves',
    displayName: 'Safety Gloves',
    category: 'hand',
    icon: '🧤',
    modelClassId: 1,
    enabled: false,
    required: false,
  },
  {
    name: 'goggles',
    displayName: 'Safety Goggles',
    category: 'eye',
    icon: '🥽',
    modelClassId: 4,
    enabled: false,
    required: false,
  },
  {
    name: 'boots',
    displayName: 'Safety Boots',
    category: 'foot',
    icon: '🥾',
    modelClassId: 3,
    enabled: false,
    required: false,
  },
];

async function seedPPEConfig() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safesight');
    console.log('📦 Connected to MongoDB');

    // Clear existing configs
    await PPEConfig.deleteMany({});
    console.log('🗑️  Cleared existing PPE configurations');

    // Insert default configs
    await PPEConfig.insertMany(defaultPPEItems);
    console.log('✅ Seeded default PPE configurations:');
    defaultPPEItems.forEach(item => {
      console.log(`   - ${item.icon} ${item.displayName} (${item.enabled ? 'enabled' : 'disabled'})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding PPE config:', error);
    process.exit(1);
  }
}

seedPPEConfig();
