import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../../../models/User';

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

export default async function handler(req, res) {
  await connectDB();
  
  const { token } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Hash token to compare
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('email name');

    if (!user) {
      return res.status(400).json({
        success: false,
        isValid: false,
        message: 'Invalid or expired reset token'
      });
    }

    return res.status(200).json({
      success: true,
      isValid: true,
      user: {
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Check token error:', error);
    return res.status(500).json({
      success: false,
      isValid: false,
      message: 'Error validating token'
    });
  }
}