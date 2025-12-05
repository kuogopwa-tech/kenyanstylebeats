import mongoose from 'mongoose';
import { IncomingForm } from 'formidable';
import fs from 'fs';

import Beat from '../../models/Beat';
import auth from '../../middleware/auth';
import gridfsUpload from '../../middleware/gridfsUpload';

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

export default async function handler(req, res) {
  await connectDB();
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Beat ID is required'
    });
  }

  try {
    // GET - Get single beat
    if (req.method === 'GET') {
      const beat = await Beat.findById(id).populate('uploadedBy', 'name email');
      
      if (!beat) {
        return res.status(404).json({
          success: false,
          message: 'Beat not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: beat
      });
    }

    // PUT - Update beat
    if (req.method === 'PUT') {
      try {
        // Check authentication
        const authResult = await auth.protect(req, res);
        if (!authResult || !authResult.user) {
          return res.status(401).json({
            success: false,
            message: 'Not authenticated'
          });
        }

        const beat = await Beat.findById(id);
        if (!beat) {
          return res.status(404).json({
            success: false,
            message: 'Beat not found'
          });
        }

        // Check permissions
        if (authResult.user.role !== 'admin' && 
            beat.uploadedBy.toString() !== authResult.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to update this beat'
          });
        }

        // Parse form data if content-type is multipart
        let updateData = req.body;
        if (req.headers['content-type']?.includes('multipart/form-data')) {
          const form = new IncomingForm();
          const { fields } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields) => {
              if (err) reject(err);
              resolve({ fields });
            });
          });
          updateData = fields;
        }

        const updatedBeat = await Beat.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        ).populate('uploadedBy', 'name email');

        return res.status(200).json({
          success: true,
          data: updatedBeat
        });

      } catch (error) {
        console.error('Update error:', error);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    // DELETE - Delete beat
    if (req.method === 'DELETE') {
      try {
        // Check authentication
        const authResult = await auth.protect(req, res);
        if (!authResult || !authResult.user) {
          return res.status(401).json({
            success: false,
            message: 'Not authenticated'
          });
        }

        const beat = await Beat.findById(id);
        if (!beat) {
          return res.status(404).json({
            success: false,
            message: 'Beat not found'
          });
        }

        // Check permissions
        if (authResult.user.role !== 'admin' && 
            beat.uploadedBy.toString() !== authResult.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this beat'
          });
        }

        // Delete associated GridFS files
        if (beat.fileId) {
          await gridfsUpload.deleteFromGridFS(beat.fileId);
        }
        if (beat.thumbnailId) {
          await gridfsUpload.deleteFromGridFS(beat.thumbnailId);
        }

        await beat.deleteOne();

        return res.status(200).json({
          success: true,
          message: 'Beat deleted successfully'
        });

      } catch (error) {
        console.error('Delete error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error deleting beat'
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