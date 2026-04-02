const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const ac = require('../controllers/adminController');

router.use(auth, adminOnly);

// Статистика
router.get('/dashboard', ac.getDashboardStats);

// Пользователи
router.get('/users', ac.getUsers);
router.put('/users/:id/block', ac.blockUser);
router.delete('/users/:id', ac.deleteUser);

// Треки
router.get('/tracks', ac.getAllTracks);
router.put('/tracks/:id/block', ac.blockTrack);
router.put('/tracks/:id/seo', ac.updateTrackSeo);

// Жанры
router.get('/genres', ac.getGenres);
router.post('/genres', ac.createGenre);
router.put('/genres/:id', ac.updateGenre);
router.delete('/genres/:id', ac.deleteGenre);

module.exports = router;
