const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories if they don't exist
const audioUploadPath = 'uploads/audio';
const stylesUploadPath = 'uploads/styles';

if (!fs.existsSync(audioUploadPath)) {
    fs.mkdirSync(audioUploadPath, { recursive: true });
}
if (!fs.existsSync(stylesUploadPath)) {
    fs.mkdirSync(stylesUploadPath, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const fileType = req.body.fileType;
        if (fileType === 'Audio') {
            cb(null, audioUploadPath);
        } else if (fileType === 'Style') {
            cb(null, stylesUploadPath);
        } else {
            cb(new Error('Invalid file type'), null);
        }
    },
    filename: function (req, file, cb) {
        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = file.fieldname + '-' + uniqueSuffix + ext;
        cb(null, filename);
    }
});

// File filter - UPDATED to handle .STY files properly
const fileFilter = (req, file, cb) => {
    const fileType = req.body.fileType;
    
    if (!fileType) {
        return cb(new Error('File type is required'), false);
    }
    
    // Get file extension in lowercase
    const extname = path.extname(file.originalname).toLowerCase();
    
    if (fileType === 'Audio') {
        // Accept audio files
        const allowedAudioExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac'];
        if (allowedAudioExtensions.includes(extname)) {
            cb(null, true);
        } else {
            cb(new Error(`Only ${allowedAudioExtensions.join(', ')} audio files are allowed`), false);
        }
    } else if (fileType === 'Style') {
        // Accept style files - both .sty and .STY
        if (extname === '.sty') {
            cb(null, true);
        } else {
            cb(new Error('Only .STY files are allowed for Style type'), false);
        }
    } else {
        cb(new Error('Invalid file type. Must be either "Audio" or "Style"'), false);
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
        files: 1
    }
});

// Middleware for single file upload
exports.uploadBeat = upload.single('file');

// Error handler for multer
exports.handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 50MB'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field'
            });
        }
    }
    
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error'
        });
    }
    
    next();
};