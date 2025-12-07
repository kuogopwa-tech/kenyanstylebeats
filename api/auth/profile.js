import { getProfile, updateProfile } from '../../lib/controllers/authController.js';
import { connectToDatabase } from '../../lib/db/connection.js';
import { protect } from '../../lib/middleware/auth.js';

export default async function handler(req, res) {
  try {
    await connectToDatabase();
    
    // Apply auth middleware
    const user = await protect(req, res);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Add user to request object (like Express middleware does)
    req.user = user;
    
    if (req.method === 'GET') {
      await getProfile(req, res);
    } 
    else if (req.method === 'PUT') {
      await updateProfile(req, res);
    }
    else {
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed' 
      });
    }
    
  } catch (error) {
    console.error('Serverless profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}