const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const authController = require('../controllers/authController');

router.post('/admin/login', authController.adminLogin);
router.post('/google', authController.googleAuth);
router.get('/me', auth, authController.getMe);
router.get('/liked', auth, authController.getLikedTracks);
router.get('/saved', auth, authController.getSavedTracks);
router.post('/become-artist', auth, uploadImage, authController.becomeArtist);
router.put('/profile', auth, uploadImage, authController.updateProfile);

module.exports = router;
