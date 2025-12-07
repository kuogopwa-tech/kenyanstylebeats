// utils/purchaseUtils.js
const Purchase = require('../models/Purchase');

exports.verifyPurchase = async (userId, beatId) => {
  try {
    // Check for used purchase
    const usedPurchase = await Purchase.findOne({
      user: userId,
      beat: beatId,
      status: 'used',
      downloadAttempts: { $lt: 1 }
    });
    
    if (usedPurchase) {
      return {
        valid: true,
        type: 'used',
        purchase: usedPurchase,
        message: 'Valid used purchase found'
      };
    }
    
    // Check for pending purchase (not expired)
    const pendingPurchase = await Purchase.findOne({
      user: userId,
      beat: beatId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });
    
    if (pendingPurchase) {
      // Convert pending to used
      pendingPurchase.status = 'used';
      pendingPurchase.usedAt = new Date();
      pendingPurchase.downloadAttempts = 1;
      await pendingPurchase.save();
      
      return {
        valid: true,
        type: 'new',
        purchase: pendingPurchase,
        message: 'Pending purchase converted to used'
      };
    }
    
    // No valid purchase found
    return {
      valid: false,
      message: 'No valid purchase found'
    };
    
  } catch (error) {
    console.error('Purchase verification error:', error);
    return {
      valid: false,
      message: 'Error verifying purchase',
      error: error.message
    };
  }
};