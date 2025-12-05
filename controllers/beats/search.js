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
    
    return res.status(200).json({
      success: true,
      count: beats.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: beats
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching beats'
    });
  }
}