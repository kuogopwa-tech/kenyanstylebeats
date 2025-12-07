const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Routes
const authRoutes = require('../routes/authRoutes');
const beatRoutes = require('./routes/beats');
const purchaseRoutes = require('./routes/purchases');
const connectDB = require('./config/database');

const app = express();

// -------- SECURITY --------
app.use(helmet());

// -------- CORS --------
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Preflight
app.options('*', (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(200);
});

// -------- PARSERS --------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------- LOGGING --------
app.use((req, res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`);
  next();
});

// -------- RATE LIMITING --------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use('/api/', limiter);

// -------- ROUTES --------
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Empire Beatstore API is running",
    time: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/beats', beatRoutes);
app.use('/api/purchases', purchaseRoutes);

// Default welcome
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "🎵 Welcome to EMPIRE BEATSTORE API (Serverless)",
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// -------- EXPORT FOR VERCEL --------

let isConnected = false;

module.exports = async function handler(req, res) {
  // Connect to DB ONCE (serverless cold start)
  if (!isConnected) {
    await connectDB();
    isConnected = true;
    console.log("💾 MongoDB Connected (Serverless)");
  }

  // Pass request into Express
  return app(req, res);
};
