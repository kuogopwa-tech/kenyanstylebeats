import mongoose from 'mongoose';
import User from '../../models/User';
import Purchase from '../../models/Purchase';
import auth from '../../middleware/auth';

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
    // Check admin access
    const authResult = await auth.restrictTo('admin')(req);
    if (!authResult.success) {
      return res.status(authResult.error.status).json({
        success: false,
        message: authResult.error.message
      });
    }

    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users with pagination
    const users = await User.find(query)
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get purchase count for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const purchaseCount = await Purchase.countDocuments({ user: user._id });
        const totalSpent = await Purchase.aggregate([
          { $match: { user: user._id } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        return {
          ...user.toObject(),
          purchaseCount,
          totalSpent: totalSpent[0]?.total || 0
        };
      })
    );

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      users: usersWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
}