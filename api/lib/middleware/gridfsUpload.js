const multer = require('multer');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');

// Multer configuration to use temporary disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/tmp/uploads'); // Temporary directory
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Enhanced file filter
const fileFilter = (req, file, cb) => {
  try {
    const fileType = req.body.fileType;
    
    if (!fileType) {
      return cb(new Error('File type is required. Specify "Audio" or "Style"'), false);
    }
    
    const extname = path.extname(file.originalname).toLowerCase();
    const fileTypeLower = fileType.toLowerCase();
    
    const audioExtensions = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac'
    };
    
    if (fileTypeLower === 'audio') {
      if (audioExtensions[extname]) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported audio format. Allowed: ${Object.keys(audioExtensions).join(', ')}`), false);
      }
    } else if (fileTypeLower === 'style') {
      if (extname === '.sty') {
        cb(null, true);
      } else {
        cb(new Error('Only .STY files are allowed for Style type'), false);
      }
    } else {
      cb(new Error('Invalid file type. Must be "Audio" or "Style"'), false);
    }
  } catch (error) {
    cb(error, false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1
  }
});

// Check database connection
const checkDbConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database not connected. State: ' + mongoose.connection.readyState);
  }
};

// Upload to GridFS using streams
const uploadToGridFS = async (filePath, originalFilename, metadata = {}) => {
  return new Promise((resolve, reject) => {
    try {
      checkDbConnection();
      
      const db = mongoose.connection.db;
      const bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'uploads',
        chunkSizeBytes: 255 * 1024, // 255KB chunks
      });

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const safeOriginalName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}_${randomString}_${safeOriginalName}`;
      
      console.log('Starting GridFS upload:', {
        originalName: originalFilename,
        filename: filename,
        filePath: filePath
      });

      // Prepare metadata
      const fullMetadata = {
        originalName: originalFilename,
        uploadDate: new Date(),
        ...metadata
      };

      // Create upload stream
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: fullMetadata
      });

      // Create read stream from file
      const fs = require('fs');
      const readStream = fs.createReadStream(filePath);

      let uploadedBytes = 0;
      const stats = fs.statSync(filePath);
      const totalBytes = stats.size;

      // Track progress
      readStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const percentage = Math.round((uploadedBytes / totalBytes) * 100);
        if (percentage % 10 === 0) {
          console.log(`Upload progress: ${percentage}%`);
        }
      });

      // Handle upload completion
      uploadStream.on('finish', () => {
        console.log('✅ GridFS upload completed:', {
          fileId: uploadStream.id,
          filename: filename,
          size: totalBytes
        });
        
        // Clean up temp file
        fs.unlinkSync(filePath);
        
        resolve({
          fileId: uploadStream.id,
          filename: filename,
          originalName: originalFilename,
          size: totalBytes,
          uploadDate: new Date(),
          metadata: fullMetadata
        });
      });

      // Handle errors
      uploadStream.on('error', (error) => {
        console.error('GridFS upload error:', error);
        fs.unlinkSync(filePath); // Clean up temp file
        reject(new Error(`Upload failed: ${error.message}`));
      });

      readStream.on('error', (error) => {
        console.error('File read error:', error);
        uploadStream.destroy();
        reject(error);
      });

      // Pipe the file to GridFS
      readStream.pipe(uploadStream);

    } catch (error) {
      console.error('GridFS upload setup error:', error);
      reject(error);
    }
  });
};

// Download from GridFS
const downloadFromGridFS = async (fileId, res) => {
  return new Promise(async (resolve, reject) => {
    try {
      checkDbConnection();
      
      const db = mongoose.connection.db;
      const bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'uploads'
      });

      // Convert to ObjectId
      const objectId = mongoose.Types.ObjectId.isValid(fileId) 
        ? new mongoose.Types.ObjectId(fileId) 
        : fileId;

      // Find file
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        return reject(new Error('File not found'));
      }

      const file = files[0];
      const fileSize = file.length;
      
      // Set headers
      res.set({
        'Content-Type': file.metadata?.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.metadata?.originalName || file.filename}"`,
        'Content-Length': fileSize
      });

      // Create download stream
      const downloadStream = bucket.openDownloadStream(objectId);
      
      // Pipe to response
      downloadStream.pipe(res);
      
      // Handle stream events
      downloadStream.on('end', () => {
        console.log('Download completed:', fileId);
        resolve();
      });
      
      downloadStream.on('error', (error) => {
        console.error('Download stream error:', error);
        reject(error);
      });

    } catch (error) {
      console.error('GridFS download error:', error);
      reject(error);
    }
  });
};

// Stream audio with range support
const streamAudioFromGridFS = async (fileId, req, res) => {
  return new Promise(async (resolve, reject) => {
    try {
      checkDbConnection();
      
      const db = mongoose.connection.db;
      const bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'uploads'
      });

      // Convert to ObjectId
      const objectId = mongoose.Types.ObjectId.isValid(fileId) 
        ? new mongoose.Types.ObjectId(fileId) 
        : fileId;

      // Find file
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        return reject(new Error('File not found'));
      }

      const file = files[0];
      const fileSize = file.length;
      const range = req.headers.range;

      if (range) {
        // Parse range
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        // Set partial content headers
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': file.metadata?.mimeType || 'audio/mpeg'
        });
        
        // Create stream with range
        const downloadStream = bucket.openDownloadStream(objectId, { start, end: end + 1 });
        downloadStream.pipe(res);
      } else {
        // Full file
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': file.metadata?.mimeType || 'audio/mpeg'
        });
        
        const downloadStream = bucket.openDownloadStream(objectId);
        downloadStream.pipe(res);
      }

      res.on('finish', () => resolve());
      res.on('error', (error) => reject(error));

    } catch (error) {
      console.error('Stream audio error:', error);
      reject(error);
    }
  });
};

// Get file info
const getFileInfo = async (fileId) => {
  try {
    checkDbConnection();
    
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
    
    const objectId = mongoose.Types.ObjectId.isValid(fileId) 
      ? new mongoose.Types.ObjectId(fileId) 
      : fileId;
      
    const files = await bucket.find({ _id: objectId }).toArray();
    return files[0] || null;
  } catch (error) {
    console.error('Get file info error:', error);
    throw error;
  }
};

// Delete from GridFS
const deleteFromGridFS = async (fileId) => {
  try {
    checkDbConnection();
    
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
    
    const objectId = mongoose.Types.ObjectId.isValid(fileId) 
      ? new mongoose.Types.ObjectId(fileId) 
      : fileId;
      
    await bucket.delete(objectId);
    return true;
  } catch (error) {
    console.error('Delete from GridFS error:', error);
    throw error;
  }
};

// Error handler
const handleUploadError = (err, req, res, next) => {
  console.error('Upload error:', err);
  
  if (err instanceof multer.MulterError) {
    const errors = {
      LIMIT_FILE_SIZE: 'File size too large. Maximum size is 50MB',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
      LIMIT_FIELD_KEY: 'Field name too long',
      LIMIT_FIELD_VALUE: 'Field value too long',
      LIMIT_FIELD_COUNT: 'Too many fields',
      LIMIT_PART_COUNT: 'Too many parts'
    };
    
    return res.status(400).json({
      success: false,
      message: errors[err.code] || 'File upload error',
      code: err.code
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  
  next();
};

module.exports = {
  uploadMiddleware: upload.single('file'),
  uploadToGridFS,
  downloadFromGridFS,
  streamAudioFromGridFS,
  deleteFromGridFS,
  getFileInfo,
  handleUploadError
};