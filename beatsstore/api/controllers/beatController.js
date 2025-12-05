const Beat = require('../models/Beat');
const mongoose = require('mongoose');
const fs = require('fs');
const Purchase = require('../models/Purchase');
const path = require('path');
const { 
  uploadToGridFS, 
  downloadFromGridFS, 
  streamAudioFromGridFS,
  getFileInfo,
  deleteFromGridFS 
} = require('../middleware/gridfsUpload');

// Upload beat with GridFS
exports.uploadBeat = async (req, res) => {
  let tempFilePath = null;
  
  try {
    console.log('Upload request received');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    tempFilePath = req.file.path;
    const { fileType, series, price, title, genre, tags } = req.body;
    
    // Validation
    if (!fileType || !series || !price) {
      // Clean up temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      return res.status(400).json({
        success: false,
        message: 'File type, series, and price are required'
      });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      // Clean up temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    console.log('Uploading to GridFS...');
    
    // Get file stats
    const stats = fs.statSync(tempFilePath);
    const fileSize = stats.size;
    
    // Determine mime type
    const extname = path.extname(req.file.originalname).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.sty': 'application/octet-stream'
    };
    
    const mimeType = mimeTypes[extname] || req.file.mimetype || 'application/octet-stream';
    
    // Upload to GridFS
    const gridFSResult = await uploadToGridFS(tempFilePath, req.file.originalname, {
      fileType: fileType,
      series: series,
      price: priceNum,
      genre: genre,
      tags: tags,
      mimeType: mimeType,
      uploadedBy: req.user._id.toString(),
      uploadedByEmail: req.user.email,
      uploadedAt: new Date().toISOString()
    });

    console.log('GridFS upload successful:', gridFSResult);

    // Create beat record
    const beat = await Beat.create({
      fileType: fileType.charAt(0).toUpperCase() + fileType.slice(1).toLowerCase(),
      series: series.trim(),
      price: priceNum,
      fileId: gridFSResult.fileId,
      fileName: gridFSResult.filename,
      originalName: req.file.originalname,
      fileSize: fileSize,
      mimeType: mimeType,
      title: title || req.file.originalname.replace(/\.[^/.]+$/, ""),
      genre: genre ? genre.trim() : undefined,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      uploadedBy: req.user._id
    });

    console.log(`✅ Beat uploaded by ${req.user.email}: ${beat.title} (${beat.fileType})`);
    console.log(`📁 GridFS ID: ${beat.fileId}`);

    res.status(201).json({
      success: true,
      message: 'Beat uploaded successfully to MongoDB GridFS',
      beat: {
        id: beat._id,
        title: beat.title,
        fileType: beat.fileType,
        series: beat.series,
        price: beat.price,
        genre: beat.genre,
        fileName: beat.fileName,
        originalName: beat.originalName,
        fileSize: beat.fileSize,
        fileId: beat.fileId,
        createdAt: beat.createdAt,
        uploadedBy: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email
        }
      }
    });

  } catch (error) {
    console.error('❌ Upload beat error:', error);
    
    // Clean up temp file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading beat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Download beat


// Stream audio
exports.streamAudio = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID'
      });
    }

    const beat = await Beat.findOne({ 
      fileId,
      fileType: 'Audio'
    });
    
    if (!beat) {
      return res.status(404).json({
        success: false,
        message: 'Audio file not found'
      });
    }

    // Stream from GridFS
    await streamAudioFromGridFS(new mongoose.Types.ObjectId(fileId), req, res);

    // Increment play count (non-blocking)
    Beat.findByIdAndUpdate(beat._id, { $inc: { plays: 1 } }).catch(err => {
      console.error('Error updating play count:', err);
    });

  } catch (error) {
    console.error('Stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error streaming audio'
      });
    }
  }
};

// Get all beats (optimized)
exports.getBeats = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      series, 
      fileType, 
      minPrice, 
      maxPrice,
      sort = 'newest',
      search,
      genre,
      tags 
    } = req.query;

    // Build filter
    const filter = { isActive: true };
    
    if (series) filter.series = { $regex: new RegExp(series, 'i') };
    if (fileType) filter.fileType = fileType;
    if (genre) filter.genre = { $regex: new RegExp(genre, 'i') };
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: new RegExp(search, 'i') } },
        { series: { $regex: new RegExp(search, 'i') } },
        { genre: { $regex: new RegExp(search, 'i') } },
        { tags: { $regex: new RegExp(search, 'i') } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let sortOption = { createdAt: -1 };
    switch(sort) {
      case 'price-low':
        sortOption = { price: 1 };
        break;
      case 'price-high':
        sortOption = { price: -1 };
        break;
      case 'popular':
        sortOption = { downloads: -1 };
        break;
      case 'plays':
        sortOption = { plays: -1 };
        break;
      case 'featured':
        filter.isFeatured = true;
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
    }

    const [beats, total, seriesList, genreList] = await Promise.all([
      Beat.find(filter)
        .populate('uploadedBy', 'name email avatar')
        .select('-__v')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Beat.countDocuments(filter),
      Beat.distinct('series', { isActive: true }),
      Beat.distinct('genre', { isActive: true, genre: { $ne: null, $ne: '' } })
    ]);

    // Add URLs
    const transformedBeats = beats.map(beat => ({
      ...beat,
      id: beat._id,
      _id: undefined,
      fileUrl: `/api/beats/download/${beat.fileId}`,
      streamUrl: beat.fileType === 'Audio' ? `/api/beats/stream/${beat.fileId}` : null,
      thumbnailUrl: beat.thumbnailId ? `/api/beats/thumbnail/${beat.thumbnailId}` : null
    }));

    res.json({
      success: true,
      count: transformedBeats.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      series: seriesList,
      genres: genreList,
      beats: transformedBeats
    });

  } catch (error) {
    console.error('Get beats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching beats'
    });
  }
};

// Get single beat
exports.getBeatById = async (req, res) => {
  try {
    const beat = await Beat.findById(req.params.id)
      .populate('uploadedBy', 'name email avatar bio')
      .select('-__v')
      .lean();

    if (!beat) {
      return res.status(404).json({
        success: false,
        message: 'Beat not found'
      });
    }

    const transformedBeat = {
      ...beat,
      id: beat._id,
      _id: undefined,
      fileUrl: `/api/beats/download/${beat.fileId}`,
      streamUrl: beat.fileType === 'Audio' ? `/api/beats/stream/${beat.fileId}` : null,
      thumbnailUrl: beat.thumbnailId ? `/api/beats/thumbnail/${beat.thumbnailId}` : null
    };

    res.json({
      success: true,
      beat: transformedBeat
    });

  } catch (error) {
    console.error('Get beat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching beat'
    });
  }
};

// Delete beat
exports.deleteBeat = async (req, res) => {
  try {
    const beat = await Beat.findById(req.params.id);
    
    if (!beat) {
      return res.status(404).json({
        success: false,
        message: 'Beat not found'
      });
    }

    // Check permissions
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?._id.toString() === beat.uploadedBy.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this beat'
      });
    }

    // Delete from GridFS
    try {
      await deleteFromGridFS(beat.fileId);
      console.log('✅ Deleted GridFS file:', beat.fileId);
      
      // Also delete thumbnail if exists
      if (beat.thumbnailId) {
        await deleteFromGridFS(beat.thumbnailId);
      }
    } catch (gridfsError) {
      console.error('Failed to delete GridFS file:', gridfsError);
    }

    // Delete from database
    await beat.deleteOne();

    res.json({
      success: true,
      message: 'Beat and associated files deleted successfully'
    });

  } catch (error) {
    console.error('Delete beat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting beat'
    });
  }
};

// Update beat details
exports.updateBeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, price, genre, series, fileType, isActive, isFeatured, tags } = req.body;

    const beat = await Beat.findById(id);

    if (!beat) {
      return res.status(404).json({
        success: false,
        message: "Beat not found"
      });
    }

    // Check permissions
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?._id.toString() === beat.uploadedBy.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this beat'
      });
    }

    // Update fields
    if (title !== undefined) beat.title = title;
    if (price !== undefined) beat.price = parseFloat(price);
    if (genre !== undefined) beat.genre = genre;
    if (series !== undefined) beat.series = series;
    if (fileType !== undefined) beat.fileType = fileType;
    if (isActive !== undefined) beat.isActive = isActive;
    if (isFeatured !== undefined) beat.isFeatured = isFeatured;
    if (tags !== undefined) beat.tags = tags.split(',').map(tag => tag.trim());

    await beat.save();

    res.json({
      success: true,
      message: "Beat updated successfully",
      beat: {
        id: beat._id,
        title: beat.title,
        price: beat.price,
        genre: beat.genre,
        series: beat.series,
        fileType: beat.fileType,
        isActive: beat.isActive,
        isFeatured: beat.isFeatured,
        tags: beat.tags,
        updatedAt: beat.updatedAt
      }
    });

  } catch (error) {
    console.error("Update beat error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating beat"
    });
  }
};

// Get stats
exports.getStats = async (req, res) => {
  try {
    const [totalBeats, activeBeats, totalDownloads, totalPlays, totalPurchases, totalLikes] = await Promise.all([
      Beat.countDocuments(),
      Beat.countDocuments({ isActive: true }),
      Beat.aggregate([{ $group: { _id: null, downloads: { $sum: "$downloads" } } }]),
      Beat.aggregate([{ $group: { _id: null, plays: { $sum: "$plays" } } }]),
      Beat.aggregate([{ $group: { _id: null, purchases: { $sum: "$purchases" } } }]),
      Beat.aggregate([{ $group: { _id: null, likes: { $sum: "$likes" } } }])
    ]);

    // Get storage stats from GridFS
    const db = mongoose.connection.db;
    const filesCollection = db.collection('uploads.files');
    const storageStats = await filesCollection.aggregate([
      { $group: { 
        _id: null, 
        totalSize: { $sum: "$length" },
        count: { $sum: 1 }
      } }
    ]).toArray();

    res.json({
      success: true,
      stats: {
        totalBeats,
        activeBeats,
        totalDownloads: totalDownloads[0]?.downloads || 0,
        totalPlays: totalPlays[0]?.plays || 0,
        totalPurchases: totalPurchases[0]?.purchases || 0,
        totalLikes: totalLikes[0]?.likes || 0,
        storage: {
          totalFiles: storageStats[0]?.count || 0,
          totalSize: storageStats[0]?.totalSize || 0,
          totalSizeMB: storageStats[0] ? (storageStats[0].totalSize / (1024 * 1024)).toFixed(2) : 0
        }
      }
    });

  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching stats"
    });
  }
};

// Upload thumbnail for beat
exports.uploadThumbnail = async (req, res) => {
  let tempFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a thumbnail image'
      });
    }

    tempFilePath = req.file.path;
    const { id } = req.params;

    const beat = await Beat.findById(id);
    
    if (!beat) {
      // Clean up temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      return res.status(404).json({
        success: false,
        message: 'Beat not found'
      });
    }

    // Check permissions
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?._id.toString() === beat.uploadedBy.toString();
    
    if (!isAdmin && !isOwner) {
      // Clean up temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this beat'
      });
    }

    // Delete old thumbnail if exists
    if (beat.thumbnailId) {
      try {
        await deleteFromGridFS(beat.thumbnailId);
      } catch (error) {
        console.error('Error deleting old thumbnail:', error);
      }
    }

    // Upload new thumbnail to GridFS
    const gridFSResult = await uploadToGridFS(tempFilePath, req.file.originalname, {
      fileType: 'Thumbnail',
      beatId: beat._id,
      uploadedBy: req.user._id.toString(),
      uploadedAt: new Date().toISOString()
    });

    // Update beat with thumbnail ID
    beat.thumbnailId = gridFSResult.fileId;
    await beat.save();

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnailId: gridFSResult.fileId
    });

  } catch (error) {
    console.error('Upload thumbnail error:', error);
    
    // Clean up temp file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading thumbnail'
    });
  }
};



exports.downloadBeat = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { purchaseKey } = req.body || {};
    
    console.log('🎯 DOWNLOAD ATTEMPT =================');
    console.log('📋 File ID:', fileId);
    console.log('🔑 Purchase Key:', purchaseKey || 'None');
    console.log('👤 User:', req.user ? `${req.user._id} (${req.user.email})` : 'No user');
    console.log('📝 Request body:', req.body);
    console.log('🔍 Headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type']
    });

    // Quick validation
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      console.log('❌ Invalid fileId format');
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID'
      });
    }

    const fileIdObj = new mongoose.Types.ObjectId(fileId);
    
    // Find beat
    const beat = await Beat.findOne({ fileId: fileIdObj })
      .populate('uploadedBy', 'name email username');
    
    if (!beat) {
      console.log('❌ Beat not found (but test shows it exists!)');
      console.log('🔄 Searching fileId as string...');
      
      // Try searching as string too
      const beatAsString = await Beat.findOne({ fileId: fileId })
        .populate('uploadedBy', 'name email username');
      
      if (beatAsString) {
        console.log('⚠️  Found beat with fileId as string!');
        console.log('FileId type in DB:', typeof beatAsString.fileId);
      }
      
      return res.status(404).json({
        success: false,
        message: 'Beat not found in database',
        debug: {
          searchedAsObjectId: fileIdObj.toString(),
          beatExists: false,
          fileId: fileId
        }
      });
    }

    console.log('✅ Beat found:', beat.title);
    console.log('💰 Price:', beat.price);
    console.log('👤 Uploaded by:', beat.uploadedBy?.email);

    // === SIMPLIFIED DOWNLOAD LOGIC ===
    
    // 1. Free beat - anyone can download
    if (beat.price === 0) {
      console.log('💰 FREE BEAT - Downloading...');
      return await handleDownload(beat, fileIdObj, res);
    }
    
    // 2. Check authentication
    if (!req.user) {
      console.log('❌ No user authentication for paid beat');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    console.log('✅ User authenticated:', req.user.email);
    
    // 3. Owner or Admin can download
    const isOwner = beat.uploadedBy && beat.uploadedBy._id.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';
    
    if (isOwner || isAdmin) {
      console.log(`✅ ${isOwner ? 'Owner' : 'Admin'} download`);
      return await handleDownload(beat, fileIdObj, res);
    }
    
    // 4. Check purchase key
    if (!purchaseKey) {
      console.log('❌ No purchase key provided');
      return res.status(400).json({
        success: false,
        message: 'Purchase key required'
      });
    }
    
    console.log('🔑 Validating purchase key...');
    
    const purchase = await Purchase.findOne({
      purchaseKey: purchaseKey.trim(),
      user: req.user._id,
      beat: beat._id,
      // Allow used purchases that were used in the last 2 minutes
      // (enough time for the download to complete after verification)
      $or: [
        { 
          status: 'pending', 
          expiresAt: { $gt: new Date() } 
        },
        { 
          status: 'used', 
          usedAt: { $gt: new Date(Date.now() - 2 * 60 * 1000) } // Used within last 2 minutes
        }
      ]
    });
    
    if (!purchase) {
      console.log('❌ Invalid or expired purchase key');
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired purchase key'
      });
    }
    
    console.log('✅ Valid purchase found, status:', purchase.status);
    
    // If still pending, mark as used
    if (purchase.status === 'pending') {
      purchase.status = 'used';
      purchase.usedAt = new Date();
      await purchase.save();
    }
    
    return await handleDownload(beat, fileIdObj, res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Download failed'
    });
  }
};

// Helper function to handle actual download
async function handleDownload(beat, fileIdObj, res) {
  try {
    // Prepare filename
    let filename = beat.originalName || beat.fileName || beat.title || 'download';
    filename = filename.replace(/[<>:"/\\|?*]/g, '_');
    
    // Add extension
    if (!path.extname(filename)) {
      const extMap = {
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'application/octet-stream': '.sty'
      };
      filename += extMap[beat.mimeType] || '.bin';
    }
    
    console.log('⬇️  Downloading:', filename);
    
    // Update stats (async)
    Beat.findByIdAndUpdate(beat._id, {
      $inc: { downloads: 1 },
      lastDownloadedAt: new Date()
    }).catch(err => console.error('Stats update failed:', err));
    
    // Download from GridFS
    await downloadFromGridFS(fileIdObj, res, filename);
    
    console.log('✅ Download completed successfully');
    
  } catch (error) {
    console.error('❌ Download handler error:', error);
    throw error;
  }
};


// Add to your beats controller
exports.testDownload = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    console.log('🧪 TEST DOWNLOAD for fileId:', fileId);
    
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.json({ error: 'Invalid fileId format' });
    }
    
    const fileIdObj = new mongoose.Types.ObjectId(fileId);
    
    // Check in Beat collection
    const beat = await Beat.findOne({ fileId: fileIdObj });
    console.log('Beat found:', !!beat);
    
    // Check in GridFS
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
    const gridFiles = await bucket.find({ _id: fileIdObj }).toArray();
    console.log('GridFS files:', gridFiles.length);
    
    res.json({
      fileId: fileId,
      beatExists: !!beat,
      beatInfo: beat ? {
        title: beat.title,
        fileId: beat.fileId?.toString()
      } : null,
      gridFSExists: gridFiles.length > 0,
      gridFSInfo: gridFiles.length > 0 ? {
        filename: gridFiles[0].filename,
        size: gridFiles[0].length
      } : null
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
};