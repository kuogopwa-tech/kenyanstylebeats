import mongoose from 'mongoose';
import User from '../../../models/User';
import auth from '../../../middleware/auth';

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

export default async function handler(req, res) {
  await connectDB();
  
  const { id } = req.query;

  if (req.method !== 'PUT') {
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

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent demoting yourself
    if (user._id.toString() === authResult.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    // Update role
    user.role = 'admin';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User promoted to admin',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Make admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating user role'
    });
  }
}