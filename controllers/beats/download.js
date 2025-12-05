import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import Beat from '../../models/Beat';
import User from '../../models/User';
import Purchase from '../../models/Purchase';
import auth from '../../middleware/auth';
import gridfsUpload from '../../middleware/gridfsUpload';

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

// Authentication middleware for downloads
async function authenticateDownload(req) {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '') ||
                req.query.token ||
                req.body?.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      return user;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  await connectDB();
  const { fileId } = req.query;

  if (!fileId) {
    return res.status(400).json({
      success: false,
      message: 'File ID is required'
    });
  }

  try {
    // POST - Download with purchase key
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

        const { purchaseKey } = req.body;
        if (!purchaseKey) {
          return res.status(400).json({
            success: false,
            message: 'Purchase key is required'
          });
        }

        // Find the beat by fileId
        const beat = await Beat.findOne({ fileId });
        if (!beat) {
          return res.status(404).json({
            success: false,
            message: 'Beat not found'
          });
        }

        // Find and validate purchase
        const purchase = await Purchase.findOne({
          purchaseKey,
          beat: beat._id,
          user: authResult.user._id
        });

        if (!purchase) {
          return res.status(404).json({
            success: false,
            message: 'Purchase not found'
          });
        }

        if (purchase.status === 'used') {
          return res.status(400).json({
            success: false,
            message: 'Purchase key already used'
          });
        }

        if (purchase.expiresAt < new Date()) {
          return res.status(400).json({
            success: false,
            message: 'Purchase key has expired'
          });
        }

        // Check if user is owner or admin (can download without purchase)
        const isOwner = beat.uploadedBy.toString() === authResult.user._id.toString();
        const isAdmin = authResult.user.role === 'admin';

        if (!isOwner && !isAdmin) {
          // Update purchase record
          purchase.status = 'used';
          purchase.usedAt = new Date();
          purchase.downloadAttempts += 1;
          await purchase.save();
        }

        // Stream file from GridFS
        await gridfsUpload.downloadFromGridFS(fileId, res);

      } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: 'Error downloading file'
          });
        }
      }
    }

    // GET - Direct download (owners/admins only)
    if (req.method === 'GET') {
      try {
        // Check authentication
        const authResult = await auth.protect(req, res);
        if (!authResult || !authResult.user) {
          return res.status(401).json({
            success: false,
            message: 'Not authenticated'
          });
        }

        // Find the beat by fileId
        const beat = await Beat.findOne({ fileId });
        if (!beat) {
          return res.status(404).json({
            success: false,
            message: 'Beat not found'
          });
        }

        // Check if user is owner or admin
        const isOwner = beat.uploadedBy.toString() === authResult.user._id.toString();
        const isAdmin = authResult.user.role === 'admin';

        if (!isOwner && !isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to download this file'
          });
        }

        // Stream file from GridFS
        await gridfsUpload.downloadFromGridFS(fileId, res);

      } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: 'Error downloading file'
          });
        }
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