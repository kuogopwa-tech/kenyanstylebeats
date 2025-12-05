import mongoose from 'mongoose';
import User from '../../models/User';
import auth from '../../middleware/auth';

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

export default async function handler(req, res) {
  await connectDB();

  try {
    // GET - Get user profile
    if (req.method === 'GET') {
      const authResult = await auth.protect(req);
      if (!authResult.success) {
        return res.status(authResult.error.status).json({
          success: false,
          message: authResult.error.message
        });
      }

      // Remove sensitive data
      const user = authResult.user.toObject();
      delete user.password;
      delete user.__v;

      return res.status(200).json({
        success: true,
        user
      });
    }

    // PUT - Update profile
    if (req.method === 'PUT') {
      const authResult = await auth.protect(req);
      if (!authResult.success) {
        return res.status(authResult.error.status).json({
          success: false,
          message: authResult.error.message
        });
      }

      const { name, email } = req.body;
      
      // Check if email is already taken by another user
      if (email && email !== authResult.user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        authResult.user._id,
        { name, email },
        { new: true, runValidators: true }
      ).select('-password -__v');

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });

  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}