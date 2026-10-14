const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'documents';
    if (file.mimetype.startsWith('video/')) {
      subfolder = 'videos';
    } else if (req.baseUrl.includes('submissions') || req.path.includes('submit')) {
      subfolder = 'submissions';
    } else if (file.mimetype.startsWith('image/')) {
      subfolder = 'covers';
    }

    const destDir = path.join(__dirname, '..', '..', 'uploads', subfolder);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // Generate safe sanitized filename with timestamp prefix
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${cleanName}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|mp4|webm|zip|tar|gz|png|jpg|jpeg|webp/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowedExtensions.test(ext)) {
    return cb(null, true);
  }
  cb(new Error(`File format .${ext} is not allowed. Only standard educational documents, media, and zip archives are accepted.`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for video/large submission packages
  }
});

module.exports = { upload };
