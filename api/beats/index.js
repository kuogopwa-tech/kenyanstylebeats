import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { IncomingForm } from 'formidable';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Models
import User from '../models/User.js';
import Beat from '../models/Beat.js';
import Purchase from '../models/Purchase.js';
import gridfsUpload from '../middleware/gridfsUpload.js';
import auth from '../middleware/auth.js';

// Middleware
import gridfsUpload from '../../middleware/gridfsUpload';
import auth from '../../middleware/auth';

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

// Parse multipart form data
async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      multiples: false,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      uploadDir: '/tmp',
      keepExtensions: true
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  await connectDB();

  try {
    // GET - Get all beats
    if (req.method === 'GET') {
      try {
        const {
          page = 1,
          limit = 20,
          genre,
          bpm_min,
          bpm_max,
          price_min,
          price_max,
          sort = '-createdAt'
        } = req.query;

        const query = {};

        // Build filter query
        if (genre) {
          query.genre = Array.isArray(genre) ? { $in: genre } : genre;
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
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit));

        const total = await Beat.countDocuments(query);

        return res.status(200).json({
          success: true,
          count: beats.length,
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          data: beats
        });

      } catch (error) {
        console.error('Get beats error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching beats'
        });
      }
    }

    // POST - Upload new beat (admin/uploader only)
    if (req.method === 'POST') {
      try {
        // Check authentication
        const authResult = await auth.protect(req, res);
        if (!authResult || !authResult.user) {
          return res.status(401).json({
            success: false,
            message: 'Not authenticated'
          });
        }

        // Check user role
        if (!['admin', 'uploader'].includes(authResult.user.role)) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to upload beats'
          });
        }

        // Parse form data
        const { fields, files } = await parseForm(req);

        // Validate required fields
        const required = ['title', 'price', 'genre', 'bpm'];
        for (const field of required) {
          if (!fields[field]) {
            return res.status(400).json({
              success: false,
              message: `${field} is required`
            });
          }
        }

        // Check if audio file exists
        if (!files.audio) {
          return res.status(400).json({
            success: false,
            message: 'Audio file is required'
          });
        }

        // Upload audio to GridFS
        const audioFile = files.audio;
        const audioBuffer = await fs.promises.readFile(audioFile.filepath);
        
        const audioResult = await gridfsUpload.uploadToGridFS(audioBuffer, {
          filename: audioFile.originalFilename || `audio-${uuidv4()}`,
          contentType: audioFile.mimetype || 'audio/mpeg',
          metadata: {
            uploadedBy: authResult.user._id,
            originalName: audioFile.originalFilename,
            type: 'audio'
          }
        });

        // Upload thumbnail if provided
        let thumbnailId = null;
        if (files.thumbnail) {
          const thumbnailFile = files.thumbnail;
          const thumbnailBuffer = await fs.promises.readFile(thumbnailFile.filepath);
          
          const thumbnailResult = await gridfsUpload.uploadToGridFS(thumbnailBuffer, {
            filename: thumbnailFile.originalFilename || `thumbnail-${uuidv4()}`,
            contentType: thumbnailFile.mimetype || 'image/jpeg',
            metadata: {
              uploadedBy: authResult.user._id,
              originalName: thumbnailFile.originalFilename,
              type: 'thumbnail'
            }
          });
          
          thumbnailId = thumbnailResult.fileId;
        }

        // Create beat record
        const beatData = {
          title: fields.title,
          description: fields.description || '',
          price: parseFloat(fields.price),
          genre: Array.isArray(fields.genre) ? fields.genre : [fields.genre],
          bpm: parseInt(fields.bpm),
          key: fields.key || '',
          tags: fields.tags ? fields.tags.split(',').map(tag => tag.trim()) : [],
          series: fields.series || '',
          fileId: audioResult.fileId,
          thumbnailId: thumbnailId,
          uploadedBy: authResult.user._id
        };

        const beat = await Beat.create(beatData);

        // Clean up temp files
        if (files.audio) await fs.promises.unlink(files.audio.filepath);
        if (files.thumbnail) await fs.promises.unlink(files.thumbnail.filepath);

        return res.status(201).json({
          success: true,
          data: await beat.populate('uploadedBy', 'name email')
        });

      } catch (error) {
        console.error('Upload error:', error);
        
        // Clean up temp files on error
        if (req.files) {
          for (const file of Object.values(req.files).flat()) {
            try {
              await fs.promises.unlink(file.filepath);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
        
        return res.status(500).json({
          success: false,
          message: 'Error uploading beat',
          error: error.message
        });
      }
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable bodyParser for multipart
  },
};