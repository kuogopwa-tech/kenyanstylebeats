const mongoose = require('mongoose');

const beatSchema = new mongoose.Schema({
  // File information
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['Audio', 'Style']
  },
  series: {
    type: String,
    required: [true, 'Series name is required'],
    trim: true,
    index: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive'],
    index: true
  },
  
  // GridFS file references
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  
  // Optional thumbnail
  thumbnailId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  
  // Metadata
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    default: ''
  },
  genre: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Stats
  downloads: {
    type: Number,
    default: 0
  },
  purchases: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  plays: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  
  // Status flags
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isExclusive: {
    type: Boolean,
    default: false
  },
  
  // Dates
  lastDownloadedAt: {
    type: Date,
    default: null
  },
  lastPlayedAt: {
    type: Date,
    default: null
  },
  
  // Relationships
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Timestamps (Mongoose will handle these)
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
beatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted file size
beatSchema.virtual('formattedFileSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for duration (for audio files - would need metadata)
beatSchema.virtual('duration').get(function() {
  // This would need to be populated from audio metadata
  return null;
});

// Indexes for better query performance
beatSchema.index({ createdAt: -1 });
beatSchema.index({ price: 1, createdAt: -1 });
beatSchema.index({ downloads: -1 });
beatSchema.index({ plays: -1 });
beatSchema.index({ series: 1, fileType: 1 });
beatSchema.index({ tags: 1 });
beatSchema.index({ isActive: 1, isFeatured: 1, isExclusive: 1 });

// Static method to get popular beats - FIXED
beatSchema.statics.getPopularBeats = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ downloads: -1, plays: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username email'); // Added missing semicolon/parenthesis
};

// Static method to get beats by series
beatSchema.statics.getBySeries = function(series, limit = 20) {
  return this.find({ 
    series: new RegExp(series, 'i'),
    isActive: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('uploadedBy', 'name email avatar');
};

// Method to increment stats
beatSchema.methods.incrementStat = async function(stat, amount = 1) {
  this[stat] = (this[stat] || 0) + amount;
  
  if (stat === 'downloads') {
    this.lastDownloadedAt = new Date();
  } else if (stat === 'plays') {
    this.lastPlayedAt = new Date();
  }
  
  return this.save();
};

// Ensure virtuals are included in JSON output
beatSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Beat = mongoose.model('Beat', beatSchema);
module.exports = Beat;