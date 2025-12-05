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

    // Set headers for streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    // Stream file from GridFS
    await gridfsUpload.streamFromGridFS(fileId, req, res);

  } catch (error) {
    console.error('Stream error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Error streaming audio'
      });
    }
  }
}