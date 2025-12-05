import mongoose from 'mongoose';
import User from '../../../models/User';
import Purchase from '../../../models/Purchase';
import auth from '../../../middleware/auth';

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

export default async function handler(req, res) {
  await connectDB();
  
  const { userId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Check authentication (optional)
    const authResult = await auth.optionalAuth(req);
    const isAuthenticated = authResult.hasAuth;

    // Find user
    const user = await User.findById(userId).select('-password -__v');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get public stats
    const purchaseCount = await Purchase.countDocuments({ user: userId });
    const totalSpent = await Purchase.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        joinDate: user.createdAt,
        isPublic: user.isPublic || true
      },
      stats: {
        purchaseCount,
        totalSpent: totalSpent[0]?.total || 0
      },
      isAuthenticated,
      canViewPrivate: isAuthenticated && (
        authResult.user.role === 'admin' || 
        authResult.user._id.toString() === userId
      )
    });

  } catch (error) {
    console.error('Public profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
}