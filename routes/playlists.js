const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const pc = require('../controllers/playlistController');

router.post('/', auth, uploadImage, pc.createPlaylist);
router.get('/my', auth, pc.getMyPlaylists);
router.get('/:id', pc.getPlaylist);
router.post('/:id/tracks', auth, pc.addTrackToPlaylist);
router.delete('/:id/tracks/:trackId', auth, pc.removeTrackFromPlaylist);
router.delete('/:id', auth, pc.deletePlaylist);

module.exports = router;
