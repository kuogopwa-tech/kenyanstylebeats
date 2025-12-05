const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Validation middleware
const validateRegister = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
];

const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/health', authController.health);

// Protected routes (require authentication)
router.get('/profile', auth.protect, authController.getProfile);
router.put('/profile', auth.protect, authController.updateProfile);
router.put('/change-password', auth.protect, authController.changePassword);
router.post('/logout', auth.protect, authController.logout);

// Admin only routes
router.get('/users', 
  auth.protect, 
  auth.restrictTo('admin'), 
  authController.getAllUsers
);

// Optional auth route example (for public profiles)
router.get('/public-profile/:userId', 
  auth.optionalAuth, 
  async (req, res) => {
    // This route can be accessed with or without authentication
    res.json({ 
      message: 'Public profile endpoint',
      isAuthenticated: !!req.user 
    });
  }
);

// Password reset routes (no email required)
router.post('/forgot-password', 
    body('email').isEmail().withMessage('Valid email is required'),
    authController.forgotPassword
);

router.post('/reset-password/:token', 
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    authController.resetPassword
);

router.get('/check-reset-token/:token', authController.checkResetToken);

// Optional: For testing
router.get('/reset-token-status/:email', authController.getResetTokenStatus);

// routes/auth.js - Add these routes
router.get('/users', auth.protect, auth.restrictTo('admin'), async (req, res) => {
    try {
        const users = await User.find()
            .select('-password -__v')
            .sort({ createdAt: -1 });
        
        // Get purchase count for each user
        const usersWithStats = await Promise.all(
            users.map(async (user) => {
                const purchaseCount = await Purchase.countDocuments({ user: user._id });
                return {
                    ...user.toObject(),
                    purchaseCount
                };
            })
        );
        
        res.json({
            success: true,
            users: usersWithStats
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

router.put('/make-admin/:id', auth.protect, auth.restrictTo('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        user.role = 'admin';
        await user.save();
        
        res.json({
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
        res.status(500).json({
            success: false,
            message: 'Error updating user role'
        });
    }
});
module.exports = router;