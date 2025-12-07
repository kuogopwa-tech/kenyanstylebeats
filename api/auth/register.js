// api/auth/register.js
import connectDB from '../../lib/db';  // Changed from '../lib/db' to '../../lib/db'
import User from '../../models/User';  // Changed from '../_models/User' to '../../models/User'
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.'
    });
  }

  try {
    // Connect to database
    await connectDB();
    
    // Get data from request body
    const { email, password, name } = req.body;
    
    // Simple validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      role: 'user'
    });
    
    // Remove password from response
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    };
    
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: userResponse
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}