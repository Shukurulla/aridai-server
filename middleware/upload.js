const multer = require('multer');
const path = require('path');

const trackStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      cb(null, path.join(__dirname, '../uploads/tracks'));
    } else if (file.fieldname === 'cover') {
      cb(null, path.join(__dirname, '../uploads/covers'));
    } else {
      cb(null, path.join(__dirname, '../uploads'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio') {
    const allowed = ['.mp3', '.wav', '.flac', '.aac', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый формат аудио'), false);
    }
  } else if (file.fieldname === 'cover' || file.fieldname === 'image') {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый формат изображения'), false);
    }
  } else {
    cb(null, true);
  }
};

const uploadTrack = multer({
  storage: trackStorage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

const uploadImage = multer({
  storage: trackStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('image');

module.exports = { uploadTrack, uploadImage };
