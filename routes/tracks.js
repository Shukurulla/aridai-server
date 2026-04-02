const router = require('express').Router();
const { auth, optionalAuth, artistOnly } = require('../middleware/auth');
const { uploadTrack } = require('../middleware/upload');
const tc = require('../controllers/trackController');

// Публичные
router.get('/', tc.getTracks);
router.get('/hits', tc.getHits);
router.get('/new', tc.getNewTracks);
router.get('/recommendations', optionalAuth, tc.getRecommendations);
router.get('/slug/:slug', tc.getTrackBySlug);
router.get('/artist/:artistId', tc.getArtistTracks);
router.get('/:id', tc.getTrackById);

// Воспроизведение
router.post('/:id/play', optionalAuth, tc.playTrack);

// Авторизованные
router.post('/', auth, artistOnly, uploadTrack, tc.uploadTrack);
router.post('/:id/like', auth, tc.likeTrack);
router.post('/:id/dislike', auth, tc.dislikeTrack);
router.post('/:id/save', auth, tc.saveTrack);
router.post('/:id/rate', auth, tc.rateTrack);
router.delete('/:id', auth, tc.deleteTrack);

// Мои треки (артист)
router.get('/my/tracks', auth, artistOnly, tc.getMyTracks);

module.exports = router;
