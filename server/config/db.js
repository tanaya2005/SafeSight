const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Prefer DB_URI (from our local .env) to avoid conflicts with global system MONGO_URI
    const uri = process.env.DB_URI || process.env.MONGO_URI;
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    throw error; // Let caller decide whether to exit
  }
};

module.exports = connectDB;
