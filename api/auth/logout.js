import { logout } from '../../lib/controllers/authController.js';
import { connectToDatabase } from '../../lib/db/connection.js';
import { protect } from '../../lib/middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    await connectToDatabase();
    
    // Optional: require auth for logout
    try {
      const user = await protect(req, res);
      req.user = user;
    } catch (authError) {
      // Allow logout even if not authenticated (clear cookies)
    }
    
    await logout(req, res);
    
  } catch (error) {
    console.error('Serverless logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}