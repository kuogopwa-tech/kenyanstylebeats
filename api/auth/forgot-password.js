import mongoose from 'mongoose';
import crypto from 'crypto';
import { body } from 'express-validator';
import User from '../../models/User';
import { sendEmail } from '../../utils/email';

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

// Simple validation
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { email } = req.body;

    // Validate email
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Still return success to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account exists, a reset email has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpire = Date.now() + 3600000; // 1 hour

    // Save token to user
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = resetTokenExpire;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || req.headers.origin}/reset-password/${resetToken}`;

    // Send email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h1>Password Reset Request</h1>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #0070f3; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Still return success, but log the error
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists, a reset email has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing password reset'
    });
  }
}