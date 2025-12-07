const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./api/routes/authRoutes');
const beatRoutes = require('./api/routes/beats');
const purchaseRoutes = require('./api/routes/purchases');
const connectDB = require('./api/config/database');

const app = express();

// Security
app.use(helmet());

// CORS
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

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/beats', beatRoutes);
app.use('/api/purchases', purchaseRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Empire Beatstore API is running',
    time: new Date().toISOString()
  });
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Redirect all non-API routes to index.html (for SPA)
app.get('*', (req, res) => {
  // If request starts with /api, return 404 JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`
    });
  }

  // Otherwise serve frontend
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
