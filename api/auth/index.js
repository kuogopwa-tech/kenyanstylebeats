import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { body, validationResult } from 'express-validator';
import User from '../../models/User';
import auth from '../../middleware/auth';

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

// Validation helper
const validateRequest = (validations) => {
  return async (req, res) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    return null;
  };
};

export default async function handler(req, res) {
  await connectDB();

  try {
    // GET - Health check
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        message: "Auth API is healthy",
        timestamp: new Date().toISOString()
      });
    }

    // POST - Register
    if (req.method === 'POST' && req.url === '/api/auth/register') {
      const validation = await validateRequest([
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
      ])(req, res);
      
      if (validation) return validation;

      const { email, password, name, role = 'user' } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        name,
        role
      });

      // Generate token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      return res.status(201).json({
        success: true,
        token,
        user: userResponse
      });
    }

    // POST - Login
    if (req.method === 'POST' && req.url === '/api/auth/login') {
      const validation = await validateRequest([
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').notEmpty().withMessage('Password is required')
      ])(req, res);
      
      if (validation) return validation;

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Generate token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      return res.status(200).json({
        success: true,
        token,
        user: userResponse
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}