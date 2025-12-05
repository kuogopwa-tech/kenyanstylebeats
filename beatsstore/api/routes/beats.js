const express = require('express');
const router = express.Router();
const beatController = require('../controllers/beatController');
const gridfsUpload = require('../middleware/gridfsUpload');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Beat = require('../models/Beat');
const Purchase = require('../models/Purchase');
const multer = require('multer');
const path = require('path');

// ======================
// MIDDLEWARE SETUP
// ======================

// Thumbnail upload middleware
const thumbnailUpload = multer({
  dest: '/tmp/uploads/thumbnails',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for thumbnails
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails'));
    }
  }
}).single('thumbnail');

// Middleware to handle thumbnail upload errors
const handleThumbnailUpload = (req, res, next) => {
  thumbnailUpload(req, res, function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// Authentication middleware for download routes
const authenticateDownload = async (req, res, next) => {
  try {
    console.log('🔐 Download authentication attempt');
    
    // Try to get token from multiple sources
    let token = req.headers.authorization?.replace('Bearer ', '') ||
                req.query.token ||
                req.body?.token;
    
    console.log('Token found:', !!token);
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user) {
          req.user = user;
          console.log('✅ User authenticated:', user.email);
        }
      } catch (jwtError) {
        console.log('❌ Invalid token:', jwtError.message);
      }
    } else {
      console.log('ℹ️ No token provided - proceeding as guest');
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    next();
  }
};

// ======================
// PUBLIC ROUTES
// ======================

// Get all beats with optional filtering
router.get('/', beatController.getBeats);

// Get single beat by ID
router.get('/:id', beatController.getBeatById);

// Stream audio (no download, just playback)
router.get('/stream/:fileId', beatController.streamAudio);

// Download thumbnail
router.get('/thumbnail/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID'
      });
    }

    await gridfsUpload.downloadFromGridFS(new mongoose.Types.ObjectId(fileId), res);
  } catch (error) {
    console.error('Download thumbnail error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error downloading thumbnail'
      });
    }
  }
});

// Debug route to check purchases
router.get('/debug/check-purchase/:beatId', auth.protect, async (req, res) => {
  try {
    const beat = await Beat.findById(req.params.beatId);
    
    if (!beat) {
      return res.status(404).json({
        success: false,
        message: 'Beat not found'
      });
    }
    
    const purchases = await Purchase.find({
      user: req.user._id,
      beat: beat._id
    }).sort({ createdAt: -1 });
    
    const validPurchases = purchases.filter(p => 
      p.status === 'used' || 
      (p.status === 'pending' && p.expiresAt > new Date())
    );
    
    res.json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        role: req.user.role
      },
      beat: {
        id: beat._id,
        title: beat.title,
        price: beat.price,
        fileId: beat.fileId
      },
      hasValidPurchase: validPurchases.length > 0,
      purchases: purchases.map(p => ({
        id: p._id,
        purchaseKey: p.purchaseKey,
        status: p.status,
        amount: p.amount,
        expiresAt: p.expiresAt,
        usedAt: p.usedAt,
        downloadAttempts: p.downloadAttempts,
        isValid: p.status === 'pending' && p.expiresAt > new Date(),
        isExpired: p.expiresAt < new Date()
      })),
      validPurchasesCount: validPurchases.length,
      totalPurchasesCount: purchases.length
    });
    
  } catch (error) {
    console.error('Debug check purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking purchases',
      error: error.message
    });
  }
});

// Test download endpoint
router.get('/test-download/:fileId', beatController.testDownload);

// ======================
// DOWNLOAD ROUTES (CRITICAL FIX)
// ======================

// POST download route (for purchase key submissions)
router.post('/download/:fileId', auth.protect, async (req, res) => {
  try {
    console.log('📤 POST Download Request ===============');
    console.log('File ID:', req.params.fileId);
    console.log('User:', req.user ? req.user.email : 'Guest');
    console.log('Body:', JSON.stringify(req.body));
    console.log('Purchase Key in body:', req.body.purchaseKey);
    console.log('Content-Type:', req.headers['content-type']);
    
    // Call the download controller
    await beatController.downloadBeat(req, res);
    
  } catch (error) {
    console.error('❌ POST download route error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error during download',
        error: error.message
      });
    }
  }
});

// GET download route (for direct downloads - owners/admins only)
router.get('/download/:fileId', auth.protect, async (req, res) => {
  try {
    console.log('📤 GET Download Request ===============');
    console.log('File ID:', req.params.fileId);
    console.log('User:', req.user.email);
    
    // For GET requests, we need to pass purchaseKey as query parameter
    req.body = { purchaseKey: req.query.purchaseKey };
    await beatController.downloadBeat(req, res);
    
  } catch (error) {
    console.error('❌ GET download route error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error during download'
      });
    }
  }
});

// Alternative download route using beat ID (for convenience)
router.get('/download-by-beat/:beatId', authenticateDownload, async (req, res) => {
  try {
    const { beatId } = req.params;
    
    console.log('🎵 Download by Beat ID:', beatId);
    
    if (!mongoose.Types.ObjectId.isValid(beatId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid beat ID'
      });
    }
    
    const beat = await Beat.findById(beatId);
    if (!beat) {
      return res.status(404).json({
        success: false,
        message: 'Beat not found'
      });
    }
    
    if (!beat.fileId) {
      return res.status(404).json({
        success: false,
        message: 'Beat file not found'
      });
    }
    
    console.log('✅ Found beat, redirecting to fileId:', beat.fileId);
    
    // Build redirect URL with token if available
    let redirectUrl = `/api/beats/download/${beat.fileId}`;
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (token) {
      redirectUrl += `?token=${token}`;
    }
    
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('Download by beat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing download request'
    });
  }
});

// ======================
// AUTHENTICATED USER ROUTES
// ======================

// Upload thumbnail
router.post('/:id/thumbnail',
  auth.protect,
  handleThumbnailUpload,
  beatController.uploadThumbnail
);

// Update beat
router.put('/:id',
  auth.protect,
  beatController.updateBeat
);

// Delete beat
router.delete('/:id',
  auth.protect,
  beatController.deleteBeat
);

// ======================
// UPLOADER/ADMIN ROUTES
// ======================

// Upload new beat
router.post('/upload',
  auth.protect,
  auth.restrictTo('admin', 'uploader'),
  gridfsUpload.uploadMiddleware,
  gridfsUpload.handleUploadError,
  beatController.uploadBeat
);

// Get statistics
router.get('/stats',
  auth.protect,
  auth.restrictTo('admin'),
  beatController.getStats
);

// ======================
// ADDITIONAL FEATURES
// ======================

// Get popular beats
router.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const popularBeats = await Beat.getPopularBeats(limit);
    
    res.json({
      success: true,
      count: popularBeats.length,
      beats: popularBeats
    });
  } catch (error) {
    console.error('Popular beats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular beats'
    });
  }
});

// Get beats by series
router.get('/series/:seriesName', async (req, res) => {
  try {
    const beats = await Beat.getBySeries(req.params.seriesName);
    
    res.json({
      success: true,
      count: beats.length,
      series: req.params.seriesName,
      beats: beats
    });
  } catch (error) {
    console.error('Series beats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching beats by series'
    });
  }
});

// Search beats
router.get('/search/all', async (req, res) => {
  try {
    const { q, genre, bpm_min, bpm_max, price_min, price_max, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (genre) {
      query.genre = { $in: genre.split(',') };
    }
    
    if (bpm_min || bpm_max) {
      query.bpm = {};
      if (bpm_min) query.bpm.$gte = parseInt(bpm_min);
      if (bpm_max) query.bpm.$lte = parseInt(bpm_max);
    }
    
    if (price_min || price_max) {
      query.price = {};
      if (price_min) query.price.$gte = parseFloat(price_min);
      if (price_max) query.price.$lte = parseFloat(price_max);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const beats = await Beat.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Beat.countDocuments(query);
    
    res.json({
      success: true,
      count: beats.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      beats
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching beats'
    });
  }
});

// ======================
// ADMIN MAINTENANCE ROUTES
// ======================

// Test GridFS connection
router.get('/test/gridfs', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'uploads'
    });
    
    const files = await bucket.find().limit(5).toArray();
    
    res.json({
      success: true,
      message: 'GridFS is working correctly',
      connectionState: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
      sampleFiles: files.map(f => ({
        id: f._id,
        filename: f.filename,
        size: f.length,
        uploadDate: f.uploadDate
      })),
      mongooseVersion: mongoose.version
    });
  } catch (error) {
    console.error('GridFS test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify uploads (admin only)
router.get('/admin/verify-uploads',
  auth.protect,
  auth.restrictTo('admin'),
  async (req, res) => {
    try {
      const db = mongoose.connection.db;
      const bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'uploads'
      });
      
      const files = await bucket.find().toArray();
      const chunksCollection = db.collection('uploads.chunks');
      const chunksCount = await chunksCollection.countDocuments();
      
      const beatFileIds = await Beat.distinct('fileId');
      const thumbnailFileIds = await Beat.distinct('thumbnailId').filter(id => id);
      
      const allReferencedFileIds = [...beatFileIds, ...thumbnailFileIds];
      const orphanedFiles = files.filter(f => 
        !allReferencedFileIds.some(id => id && id.equals(f._id))
      );
      
      res.json({
        success: true,
        filesCount: files.length,
        chunksCount: chunksCount,
        orphanedFilesCount: orphanedFiles.length,
        orphanedFiles: orphanedFiles.map(f => ({
          id: f._id,
          filename: f.filename,
          length: f.length,
          uploadDate: f.uploadDate,
          metadata: f.metadata
        })),
        beatFilesCount: beatFileIds.length,
        thumbnailFilesCount: thumbnailFileIds.length
      });
    } catch (error) {
      console.error('Verify uploads error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// Clean up orphaned GridFS files (admin only)
router.post('/admin/cleanup-orphaned',
  auth.protect,
  auth.restrictTo('admin'),
  async (req, res) => {
    try {
      const db = mongoose.connection.db;
      const bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'uploads'
      });
      
      const files = await bucket.find().toArray();
      const beatFileIds = await Beat.distinct('fileId');
      const thumbnailFileIds = await Beat.distinct('thumbnailId').filter(id => id);
      const allReferencedFileIds = [...beatFileIds, ...thumbnailFileIds];
      
      const orphanedFiles = files.filter(f => 
        !allReferencedFileIds.some(id => id && id.equals(f._id))
      );
      
      const deleteResults = [];
      for (const file of orphanedFiles) {
        try {
          await bucket.delete(file._id);
          deleteResults.push({
            id: file._id,
            filename: file.filename,
            success: true
          });
        } catch (error) {
          deleteResults.push({
            id: file._id,
            filename: file.filename,
            success: false,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: `Cleaned up ${deleteResults.filter(r => r.success).length} orphaned files`,
        deletedCount: deleteResults.filter(r => r.success).length,
        failedCount: deleteResults.filter(r => !r.success).length,
        results: deleteResults
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

// ======================
// EXPORT
// ======================

module.exports = router;