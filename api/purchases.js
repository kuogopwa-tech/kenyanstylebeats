// routes/purchases.js
const express = require('express');
const router = express.Router();
const auth = require('./middleware/auth');
const Beat = require('./models/Beat');
const Purchase = require('./models/Purchase');
const User = require('./models/User');

// ============================================
// ADMIN: Generate purchase key for a beat
// ============================================
// Update the existing generate-key route to accept expiresInHours
router.post('/admin/generate-key/:beatId', auth.protect, auth.restrictTo('admin'), async (req, res) => {
    try {
        const { beatId } = req.params;
        const { userId, expiresInHours = 24 } = req.body; // ADD expiresInHours
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        const beat = await Beat.findById(beatId);
        if (!beat) {
            return res.status(404).json({
                success: false,
                message: 'Beat not found'
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Generate unique purchase key
        const purchaseKey = generatePurchaseKey();
        
        // Calculate expiration with custom hours
        const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
        
        // Create purchase record
        const purchase = await Purchase.create({
            purchaseKey,
            beat: beatId,
            user: userId,
            seller: req.user._id,
            amount: beat.price,
            status: 'pending',
            expiresAt: expiresAt // USE custom expiration
        });
        
        res.json({
            success: true,
            message: 'Purchase key generated successfully',
            purchase: {
                id: purchase._id,
                purchaseKey,
                beat: {
                    title: beat.title,
                    price: beat.price
                },
                user: {
                    name: user.name,
                    email: user.email
                },
                expiresAt: purchase.expiresAt,
                status: purchase.status
            }
        });
        
    } catch (error) {
        console.error('Generate key error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating purchase key'
        });
    }
});
// ============================================
// USER: Verify purchase key and download
// ============================================
// ============================================
// USER: Verify purchase key and download
// ============================================
router.post('/verify-key', auth.protect, async (req, res) => {
    try {
        const { purchaseKey } = req.body;
        const userId = req.user._id;
        
        if (!purchaseKey) {
            return res.status(400).json({
                success: false,
                message: 'Purchase key is required'
            });
        }
        
        // Find purchase by key
        const purchase = await Purchase.findOne({ 
            purchaseKey,
            user: userId // Ensure key belongs to this user
        }).populate('beat', 'title price fileType fileId fileName originalName mimeType');
        
        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: 'Invalid purchase key or key not assigned to you'
            });
        }
        
        // Check if already used
        if (purchase.status === 'used') {
            return res.status(400).json({
                success: false,
                message: 'This purchase key has already been used'
            });
        }
        
        // Check if expired
        if (purchase.expiresAt < new Date()) {
            purchase.status = 'expired';
            await purchase.save();
            return res.status(400).json({
                success: false,
                message: 'Purchase key has expired'
            });
        }
        
        // Check if beat is still available
        const beat = await Beat.findById(purchase.beat._id);
        if (!beat || !beat.isActive) {
            return res.status(400).json({
                success: false,
                message: 'This beat is no longer available'
            });
        }
        
        // DON'T mark as used yet - wait for download
        // purchase.status = 'used';
        // purchase.usedAt = new Date();
        // await purchase.save();
        
        // DON'T increment purchases yet - wait for download
        // await Beat.findByIdAndUpdate(purchase.beat._id, { 
        //     $inc: { purchases: 1 }
        // });
        
        res.json({
            success: true,
            message: 'Purchase verified successfully! You can now download.',
            downloadUrl: `/api/beats/download/${purchase.beat.fileId}`,
            beat: {
                _id: purchase.beat._id,
                fileId: purchase.beat.fileId,
                title: purchase.beat.title,
                fileName: purchase.beat.fileName,
                originalName: purchase.beat.originalName,
                mimeType: purchase.beat.mimeType,
                price: purchase.beat.price
            },
            purchase: {
                id: purchase._id,
                purchaseKey: purchase.purchaseKey,
                status: purchase.status,
                canDownload: true
            }
        });
        
    } catch (error) {
        console.error('Verify key error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying purchase key'
        });
    }
});

// ============================================
// USER: Get their purchases
// ============================================
router.get('/my-purchases', auth.protect, async (req, res) => {
    try {
        const purchases = await Purchase.find({ 
            user: req.user._id,
            status: { $in: ['pending', 'used'] }
        })
        .populate('beat', 'title price fileType series')
        .populate('seller', 'name email whatsapp')
        .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: purchases.length,
            purchases: purchases.map(p => ({
                id: p._id,
                purchaseKey: p.purchaseKey,
                status: p.status,
                createdAt: p.createdAt,
                expiresAt: p.expiresAt,
                usedAt: p.usedAt,
                beat: p.beat,
                seller: p.seller
            }))
        });
        
    } catch (error) {
        console.error('Get purchases error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching purchases'
        });
    }
});

// ============================================
// ADMIN: Get all purchase keys generated
// ============================================
router.get('/admin/purchase-keys', auth.protect, auth.restrictTo('admin'), async (req, res) => {
    try {
        const purchases = await Purchase.find()
            .populate('beat', 'title price')
            .populate('user', 'name email')
            .populate('seller', 'name')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: purchases.length,
            purchases
        });
        
    } catch (error) {
        console.error('Get purchase keys error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching purchase keys'
        });
    }
});

// Helper function to generate purchase key
function generatePurchaseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 10; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `EMP-${key}`;
}

// routes/purchases.js - Add these routes
router.get('/admin/stats', auth.protect, auth.restrictTo('admin'), async (req, res) => {
    try {
        const totalKeys = await Purchase.countDocuments();
        const pendingKeys = await Purchase.countDocuments({ status: 'pending' });
        const usedKeys = await Purchase.countDocuments({ status: 'used' });
        const expiredKeys = await Purchase.countDocuments({ status: 'expired' });
        
        // Get activity data for last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const activityData = await Purchase.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);
        
        res.json({
            success: true,
            stats: {
                totalKeys,
                pendingKeys,
                usedKeys,
                expiredKeys,
                activityData
            }
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stats'
        });
    }
});

router.get('/recent', auth.protect, auth.restrictTo('admin'), async (req, res) => {
    try {
        const purchases = await Purchase.find()
            .populate('beat', 'title')
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);
        
        res.json({
            success: true,
            purchases
        });
        
    } catch (error) {
        console.error('Recent purchases error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching recent purchases'
        });
    }
});

// Extend key expiration
router.put('/admin/extend-key/:id', auth.protect, auth.restrictTo('admin'), async (req, res) => {
    try {
        const purchase = await Purchase.findById(req.params.id);
        
        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: 'Purchase not found'
            });
        }
        
        // Extend by 24 hours
        purchase.expiresAt = new Date(purchase.expiresAt.getTime() + 24 * 60 * 60 * 1000);
        await purchase.save();
        
        res.json({
            success: true,
            message: 'Key extended successfully',
            expiresAt: purchase.expiresAt
        });
        
    } catch (error) {
        console.error('Extend key error:', error);
        res.status(500).json({
            success: false,
            message: 'Error extending key'
        });
    }
});

// Cancel key
router.put('/admin/cancel-key/:id', auth.protect, auth.restrictTo('admin'), async (req, res) => {
    try {
        const purchase = await Purchase.findById(req.params.id);
        
        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: 'Purchase not found'
            });
        }
        
        purchase.status = 'cancelled';
        await purchase.save();
        
        res.json({
            success: true,
            message: 'Key cancelled successfully'
        });
        
    } catch (error) {
        console.error('Cancel key error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling key'
        });
    }
});

// ============================================
// ADMIN: Generate purchase key (using email instead of userId)
// ============================================
router.post('/generate-key', auth.protect, auth.restrictTo('admin'), async (req, res) => {
    try {
        const { beatId, userEmail, amount } = req.body;
        
        if (!beatId || !userEmail) {
            return res.status(400).json({
                success: false,
                message: 'Beat ID and user email are required'
            });
        }
        
        // Find beat
        const beat = await Beat.findById(beatId);
        if (!beat) {
            return res.status(404).json({
                success: false,
                message: 'Beat not found'
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found with that email'
            });
        }
        
        // Generate unique purchase key
        const purchaseKey = generatePurchaseKey();
        
        // Calculate expiration (24 hours from now)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Use provided amount or beat price
        const finalAmount = amount || beat.price;
        
        // Create purchase record
        const purchase = await Purchase.create({
            purchaseKey,
            beat: beatId,
            user: user._id,
            seller: req.user._id,
            amount: finalAmount,
            status: 'pending',
            expiresAt
        });
        
        // Populate the response
        const populatedPurchase = await Purchase.findById(purchase._id)
            .populate('beat', 'title price')
            .populate('user', 'name email');
        
        res.json({
            success: true,
            message: 'Purchase key generated successfully',
            purchaseKey,
            beatTitle: beat.title,
            purchase: {
                id: populatedPurchase._id,
                purchaseKey: populatedPurchase.purchaseKey,
                beat: populatedPurchase.beat,
                user: populatedPurchase.user,
                amount: populatedPurchase.amount,
                expiresAt: populatedPurchase.expiresAt,
                status: populatedPurchase.status
            }
        });
        
    } catch (error) {
        console.error('Generate key error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating purchase key',
            error: error.message
        });
    }
});

module.exports = router;