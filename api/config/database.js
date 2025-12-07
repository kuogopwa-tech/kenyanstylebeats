// api/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle runtime errors
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`🛑 Received ${signal}, closing MongoDB connection...`);
      await mongoose.connection.close();
      console.log('👋 MongoDB connection closed');
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('💥 Database connection failed:', error.message);

    // In production, don’t crash immediately — retry after 5s
    if (process.env.NODE_ENV === 'production') {
      console.log('🔁 Retrying connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1); // for dev, crash immediately
    }
  }
};

module.exports = connectDB;
