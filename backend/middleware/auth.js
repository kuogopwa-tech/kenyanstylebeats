// In api/beats/upload.js
import auth from '../../middleware/auth';
import gridfsUpload from '../../middleware/gridfsUpload';

export default async function handler(req, res) {
  try {
    // Check authentication
    const authResult = await auth.protect(req);
    if (!authResult.success) {
      return res.status(authResult.error.status).json({
        success: false,
        message: authResult.error.message
      });
    }

    // Check user role
    if (!['admin', 'uploader'].includes(authResult.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload beats'
      });
    }

    // Handle file upload
    const { buffer, filename } = await gridfsUpload.handleMultipartUpload(req);
    
    // Upload to GridFS
    const result = await gridfsUpload.uploadToGridFS(
      buffer,
      filename,
      { uploadedBy: authResult.user._id }
    );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}