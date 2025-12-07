const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./api/routes/authRoutes');
const connectDB = require('./api/config/database');

const app = express();

// Security
app.use(helmet());

// CORS (ONLY ONCE)
app.use(cors({
  origin: [
    'http://127.0.0.1:8080',
    'http://localhost:8080',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Preflight fix (very important)
app.options('*', (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(200);
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} | Origin: ${req.headers.origin}`);
  next();
});

// Rate limiter AFTER CORS and OPTIONS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Empire Beatstore API is running',
    time: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
const beatRoutes = require('./api/routes/beats');
app.use('/api/beats', beatRoutes);
const purchaseRoutes = require('./api/routes/purchases');

// Then register the routes:
app.use('/api/purchases', purchaseRoutes);

// Welcome
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "🎵 Welcome to EMPIRE BEATSTORE API",
    endpoints: {
      health: "/health",
      auth: "/api/auth"
    }
  });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error"
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on ${PORT}`);
      console.log(`🌍 CORS OK`);
    });

    const shutdown = async () => {
      console.log("Shutting down...");
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (err) {
    console.error("Startup Error:", err);
    process.exit(1);
  }
};

startServer();
