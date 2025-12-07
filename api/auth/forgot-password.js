import { forgotPassword } from '../../lib/controllers/authController.js';
import { connectToDatabase } from '../../lib/db/connection.js';
import { body, validationResult } from 'express-validator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // Validate email
    await body('email').isEmail().withMessage('Valid email is required').run(req);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    await connectToDatabase();
    await forgotPassword(req, res);
    
  } catch (error) {
    console.error('Serverless forgot-password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}