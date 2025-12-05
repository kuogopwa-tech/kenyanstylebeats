import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Serverless-friendly upload handling (no persistent storage)
class GridFSUploadServerless {
  constructor() {
    this.bucket = null;
  }

  getBucket() {
    if (!this.bucket && mongoose.connection.db) {
      this.bucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads',
        chunkSizeBytes: 255 * 1024,
      });
    }
    return this.bucket;
  }

  checkDbConnection() {
    if (mongoose.connection.readyState !== 1) {
      throw new Error(`Database not connected. State: ${mongoose.connection.readyState}`);
    }
  }

  // Helper to create temp file path
  getTempFilePath(filename) {
    const tempDir = os.tmpdir();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    return path.join(tempDir, `${filename}-${uniqueSuffix}${path.extname(filename)}`);
  }

  // File filter for serverless
  fileFilter(fileType, originalname) {
    const extname = path.extname(originalname).toLowerCase();
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
        return {
          valid: true,
          mimeType: audioExtensions[extname]
        };
      }
      return {
        valid: false,
        error: `Unsupported audio format. Allowed: ${Object.keys(audioExtensions).join(', ')}`
      };
    } else if (fileTypeLower === 'style') {
      if (extname === '.sty') {
        return { valid: true, mimeType: 'application/octet-stream' };
      }
      return { valid: false, error: 'Only .STY files are allowed for Style type' };
    }
    
    return { valid: false, error: 'Invalid file type. Must be "Audio" or "Style"' };
  }

  // Upload to GridFS from buffer (serverless-friendly)
  async uploadToGridFS(buffer, originalFilename, metadata = {}) {
    return new Promise((resolve, reject) => {
      try {
        this.checkDbConnection();
        
        const bucket = this.getBucket();
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const safeOriginalName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}_${randomString}_${safeOriginalName}`;
        
        console.log('Starting GridFS upload:', {
          originalName: originalFilename,
          filename: filename,
          size: buffer.length
        });

        // Prepare metadata
        const fullMetadata = {
          originalName: originalFilename,
          uploadDate: new Date(),
          mimeType: metadata.mimeType || 'application/octet-stream',
          ...metadata
        };

        // Create upload stream
        const uploadStream = bucket.openUploadStream(filename, {
          metadata: fullMetadata
        });

        // Track progress
        let uploadedBytes = 0;
        const totalBytes = buffer.length;
        
        // Write buffer in chunks to track progress
        const chunkSize = 1024 * 1024; // 1MB chunks
        let position = 0;
        
        const writeNextChunk = () => {
          if (position >= totalBytes) {
            uploadStream.end();
            return;
          }
          
          const chunk = buffer.slice(position, Math.min(position + chunkSize, totalBytes));
          position += chunk.length;
          uploadedBytes += chunk.length;
          
          const percentage = Math.round((uploadedBytes / totalBytes) * 100);
          if (percentage % 10 === 0) {
            console.log(`Upload progress: ${percentage}%`);
          }
          
          if (!uploadStream.write(chunk)) {
            uploadStream.once('drain', writeNextChunk);
          } else {
            setImmediate(writeNextChunk);
          }
        };

        // Handle upload completion
        uploadStream.on('finish', () => {
          console.log('✅ GridFS upload completed:', {
            fileId: uploadStream.id,
            filename: filename,
            size: totalBytes
          });
          
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
          reject(new Error(`Upload failed: ${error.message}`));
        });

        // Start uploading
        writeNextChunk();

      } catch (error) {
        console.error('GridFS upload setup error:', error);
        reject(error);
      }
    });
  }

  // Download from GridFS
  async downloadFromGridFS(fileId, res, asAttachment = true) {
    return new Promise(async (resolve, reject) => {
      try {
        this.checkDbConnection();
        
        const bucket = this.getBucket();
        const objectId = this.createObjectId(fileId);

        // Find file
        const cursor = bucket.find({ _id: objectId });
        const files = await cursor.toArray();
        
        if (files.length === 0) {
          return reject(new Error('File not found'));
        }

        const file = files[0];
        const fileSize = file.length;
        
        // Set headers
        res.setHeader('Content-Type', file.metadata?.mimeType || 'application/octet-stream');
        
        if (asAttachment) {
          res.setHeader('Content-Disposition', `attachment; filename="${file.metadata?.originalName || file.filename}"`);
        } else {
          res.setHeader('Content-Disposition', `inline; filename="${file.metadata?.originalName || file.filename}"`);
        }
        
        res.setHeader('Content-Length', fileSize);

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
  }

  // Stream audio with range support
  async streamAudioFromGridFS(fileId, req, res) {
    return new Promise(async (resolve, reject) => {
      try {
        this.checkDbConnection();
        
        const bucket = this.getBucket();
        const objectId = this.createObjectId(fileId);

        // Find file
        const cursor = bucket.find({ _id: objectId });
        const files = await cursor.toArray();
        
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
  }

  // Get file info
  async getFileInfo(fileId) {
    try {
      this.checkDbConnection();
      
      const bucket = this.getBucket();
      const objectId = this.createObjectId(fileId);
      
      const cursor = bucket.find({ _id: objectId });
      const files = await cursor.toArray();
      return files[0] || null;
    } catch (error) {
      console.error('Get file info error:', error);
      throw error;
    }
  }

  // Delete from GridFS
  async deleteFromGridFS(fileId) {
    try {
      this.checkDbConnection();
      
      const bucket = this.getBucket();
      const objectId = this.createObjectId(fileId);
      
      await bucket.delete(objectId);
      return true;
    } catch (error) {
      console.error('Delete from GridFS error:', error);
      throw error;
    }
  }

  // Helper to create ObjectId
  createObjectId(fileId) {
    if (mongoose.Types.ObjectId.isValid(fileId)) {
      return new mongoose.Types.ObjectId(fileId);
    }
    throw new Error('Invalid file ID format');
  }

  // Handle multipart uploads for serverless
  async handleMultipartUpload(req, fieldName = 'file') {
    return new Promise((resolve, reject) => {
      // For serverless, we need to handle the raw body
      const chunks = [];
      
      req.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          
          // Parse multipart data (simplified - you might want to use a library)
          const contentType = req.headers['content-type'];
          if (!contentType || !contentType.includes('multipart/form-data')) {
            throw new Error('Content-Type must be multipart/form-data');
          }
          
          const boundary = contentType.split('boundary=')[1];
          const parts = this.parseMultipart(buffer, boundary);
          
          // Find the file part
          const filePart = parts.find(part => 
            part.headers['content-disposition'].includes(`name="${fieldName}"`)
          );
          
          if (!filePart) {
            throw new Error(`No file found with field name: ${fieldName}`);
          }
          
          resolve({
            buffer: filePart.data,
            filename: this.extractFilename(filePart.headers['content-disposition']),
            contentType: filePart.headers['content-type'] || 'application/octet-stream'
          });
          
        } catch (error) {
          reject(error);
        }
      });
      
      req.on('error', reject);
    });
  }

  // Simple multipart parser
  parseMultipart(buffer, boundary) {
    const parts = [];
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
    
    let position = 0;
    
    while (position < buffer.length) {
      // Find boundary
      const boundaryIndex = buffer.indexOf(boundaryBuffer, position);
      if (boundaryIndex === -1) break;
      
      // Find next boundary
      const nextBoundaryIndex = buffer.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
      if (nextBoundaryIndex === -1) break;
      
      const partBuffer = buffer.slice(boundaryIndex + boundaryBuffer.length, nextBoundaryIndex);
      
      // Parse headers
      const headerEndIndex = partBuffer.indexOf('\r\n\r\n');
      const headersText = partBuffer.slice(0, headerEndIndex).toString();
      const data = partBuffer.slice(headerEndIndex + 4);
      
      const headers = {};
      headersText.split('\r\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const key = line.slice(0, colonIndex).trim().toLowerCase();
          const value = line.slice(colonIndex + 1).trim();
          headers[key] = value;
        }
      });
      
      parts.push({ headers, data });
      position = nextBoundaryIndex;
    }
    
    return parts;
  }

  extractFilename(contentDisposition) {
    const match = contentDisposition.match(/filename="([^"]+)"/) || 
                  contentDisposition.match(/filename=([^;]+)/);
    return match ? match[1].trim() : 'unknown';
  }

  // Error handler for serverless
  handleUploadError(err) {
    console.error('Upload error:', err);
    
    const errors = {
      LIMIT_FILE_SIZE: 'File size too large. Maximum size is 50MB',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
      LIMIT_FIELD_KEY: 'Field name too long',
      LIMIT_FIELD_VALUE: 'Field value too long',
      LIMIT_FIELD_COUNT: 'Too many fields',
      LIMIT_PART_COUNT: 'Too many parts'
    };
    
    if (errors[err.code]) {
      return {
        success: false,
        message: errors[err.code],
        code: err.code
      };
    }
    
    return {
      success: false,
      message: err.message || 'File upload error'
    };
  }
}

export default new GridFSUploadServerless();