const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/generateToken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const emailService = require('../utils/emailService');


/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Determine role
    let role = 'user';
    if (email === process.env.ADMIN_EMAIL) {
      role = 'admin';
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      role
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set cookie (optional)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'strict'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set cookie (optional)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict'
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePicture: user.profilePicture,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, bio, profilePicture } = req.body;
    const user = await User.findById(req.user._id);

    // Update allowed fields
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    // Clear cookie
    res.clearCookie('token');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      users
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

/**
 * @desc    Health check for auth service
 * @route   GET /api/auth/health
 * @access  Public
 */
const health = (req, res) => {
  res.json({
    success: true,
    service: 'authentication',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};





/**
 * @desc    Request password reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Find user
        const user = await User.findOne({ email });
        
        // Return same response whether user exists or not (security)
        if (!user) {
            return res.json({
                success: true,
                message: 'If an account exists, a reset token will be generated',
                note: 'Check console for token (in development)'
            });
        }

        // Simple rate limiting: max 5 resets per day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (user.lastResetRequest && user.lastResetRequest >= today) {
            if (user.resetRequestCount >= 5) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many reset requests today. Try again tomorrow.'
                });
            }
        } else {
            // New day, reset counter
            user.resetRequestCount = 0;
        }

        // Generate reset token (32 characters)
        const resetToken = crypto.randomBytes(16).toString('hex');
        
        // Hash token for storage
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Save to user
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        user.resetRequestCount += 1;
        user.lastResetRequest = new Date();
        await user.save();

        // In development, log the token
        console.log('\n🔐 ======= PASSWORD RESET TOKEN =======');
        console.log(`For user: ${email}`);
        console.log(`Token: ${resetToken}`);
        console.log(`Expires: ${user.resetPasswordExpire.toLocaleTimeString()}`);
        console.log(`Use: POST /api/auth/reset-password/${resetToken}`);
        console.log('======================================\n');

        res.json({
            success: true,
            message: 'Password reset token generated',
            resetToken: resetToken, // Return token in response for easy testing
            expiresIn: '30 minutes',
            instructions: 'Use this token to reset your password at /api/auth/reset-password/[token]'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing password reset request'
        });
    }
};

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Validate input
        if (!password || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        // Hash the provided token
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid, non-expired token
        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Update password
        user.password = password;
        
        // Clear reset token fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        
        await user.save();

        console.log(`✅ Password reset successful for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password'
        });
    }
};

/**
 * @desc    Check if reset token is valid
 * @route   GET /api/auth/check-reset-token/:token
 * @access  Public
 */
const checkResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        // Hash the token
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpire: { $gt: Date.now() }
        }).select('email');

        if (!user) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: 'Invalid or expired token'
            });
        }

        res.json({
            success: true,
            valid: true,
            message: 'Token is valid',
            email: user.email,
            expiresIn: 'Valid for password reset'
        });

    } catch (error) {
        console.error('Check token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking token'
        });
    }
};

/**
 * @desc    Get reset token status for testing
 * @route   GET /api/auth/reset-token-status/:email
 * @access  Public (for testing)
 */
const getResetTokenStatus = async (req, res) => {
    try {
        const { email } = req.params;

        const user = await User.findOne({ email })
            .select('resetPasswordToken resetPasswordExpire resetRequestCount lastResetRequest');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const hasValidToken = user.resetPasswordToken && 
                              user.resetPasswordExpire && 
                              user.resetPasswordExpire > new Date();

        res.json({
            success: true,
            hasActiveResetToken: hasValidToken,
            tokenExpires: user.resetPasswordExpire,
            resetRequestCount: user.resetRequestCount,
            lastResetRequest: user.lastResetRequest,
            isTokenExpired: user.resetPasswordExpire ? user.resetPasswordExpire <= new Date() : null
        });

    } catch (error) {
        console.error('Token status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting token status'
        });
    }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getAllUsers,
  forgotPassword,
  resetPassword,
  checkResetToken,
  getResetTokenStatus,
  health
};