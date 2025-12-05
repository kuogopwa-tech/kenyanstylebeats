import mongoose from 'mongoose';
import Beat from '../../models/Beat';

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get popular beats (you can customize this logic)
    const popularBeats = await Beat.find()
      .sort({ downloadCount: -1, createdAt: -1 })
      .limit(limit)
      .populate('uploadedBy', 'name email');

    return res.status(200).json({
      success: true,
      count: popularBeats.length,
      data: popularBeats
    });

  } catch (error) {
    console.error('Popular beats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching popular beats'
    });
  }
}