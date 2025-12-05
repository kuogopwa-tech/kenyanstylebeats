import mongoose from 'mongoose';
import gridfsUpload from '../../middleware/gridfsUpload';

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
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
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

    // Set cache headers for thumbnails
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Stream thumbnail from GridFS
    await gridfsUpload.downloadFromGridFS(fileId, res, true);

  } catch (error) {
    console.error('Thumbnail download error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Error downloading thumbnail'
      });
    }
  }
}