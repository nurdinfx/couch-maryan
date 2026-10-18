const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper to detect if a file is a video
function isVideoFile(file, req) {
  if (file.mimetype && file.mimetype.startsWith('video/')) return true;
  const ext = path.extname(file.originalname || '').toLowerCase();
  const videoExts = ['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v', '.3gp', '.flv', '.wmv', '.ogv', '.ts', '.mts'];
  if (videoExts.includes(ext)) return true;
  if (req && req.body && req.body.content_type === 'video') return true;
  return false;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'documents';
    if (isVideoFile(file, req)) {
      subfolder = 'videos';
    } else if (req.baseUrl.includes('messages')) {
      subfolder = 'messages';
    } else if (req.baseUrl.includes('submissions') || req.path.includes('submit')) {
      subfolder = 'submissions';
    } else if (file.mimetype && file.mimetype.startsWith('image/')) {
      subfolder = 'covers';
    }

    const baseUploadsDir = process.env.UPLOADS_DIR || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(__dirname, '..', '..', 'uploads'));
    const destDir = path.join(baseUploadsDir, subfolder);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // Generate safe sanitized filename with timestamp prefix
    const cleanName = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${cleanName}`);
  }
});

const fileFilter = (req, file, cb) => {
  // If mimetype starts with video, audio, image, or pdf - always accept
  if (file.mimetype && (
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/') ||
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf'
  )) {
    return cb(null, true);
  }

  // Common educational file extensions
  const allowedExtensions = /^(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv|rtf|mp4|webm|mov|mkv|avi|m4v|3gp|flv|wmv|ogv|ts|mp3|wav|m4a|aac|ogg|zip|rar|7z|tar|gz|png|jpg|jpeg|webp|gif|svg)$/i;
  const ext = path.extname(file.originalname || '').toLowerCase().replace(/^\./, '');
  
  if (!ext || allowedExtensions.test(ext)) {
    return cb(null, true);
  }
  
  // If the user is submitting a video lesson, allow it anyway
  if (req.body && req.body.content_type === 'video') {
    return cb(null, true);
  }

  cb(new Error(`Faylka .${ext} lama oggola. Fadlan soo geli video (MP4, MOV, WebM, MKV), document (PDF, Word, PPT), ama sawir.`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for video & large educational media
  }
});

// Safe upload middleware wrapper that catches multer errors and returns clean 400 Bad Request
function safeUploadSingle(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: 'Faylku wuu ka weyn yahay xadka la oggol yahay (ugu badnaan 500MB). Fadlan dooro video ka yar ama link YouTube isticmaal.'
            });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || 'Khalad ayaa ka dhacay soo gelinta faylka.' });
      }
      next();
    });
  };
}

module.exports = { upload, safeUploadSingle, isVideoFile };
