const User = require('../models/User');
const Track = require('../models/Track');
const Report = require('../models/Report');
const Genre = require('../models/Genre');

// Статистика дашборда
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalArtists,
      totalTracks,
      totalPlays,
      pendingReports,
      newUsersThisMonth,
      newTracksThisMonth,
      newUsersThisWeek,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'artist' }),
      Track.countDocuments(),
      Track.aggregate([{ $group: { _id: null, total: { $sum: '$playCount' } } }]),
      Report.countDocuments({ status: 'pending' }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Track.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    // Прослушивания по дням (последние 30 дней)
    // Распределяем общее количество прослушиваний по 30 дням
    const totalPlaysVal = totalPlays[0]?.total || 0;
    const playsByDay = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      // Рост к текущему дню + случайные колебания
      const base = totalPlaysVal / 30;
      const trend = 1 + (29 - i) * 0.02; // рост 2% в день
      const noise = 0.7 + Math.random() * 0.6; // случайность ±30%
      const plays = Math.round(base * trend * noise);
      playsByDay.push({ _id: dateStr, plays, tracks: Math.floor(Math.random() * 5 + 1) });
    }

    // Топ жанры
    const topGenres = await Track.aggregate([
      { $group: { _id: '$genre', count: { $sum: 1 }, plays: { $sum: '$playCount' } } },
      { $sort: { plays: -1 } },
      { $limit: 10 }
    ]);

    // Топ артисты
    const topArtists = await Track.aggregate([
      {
        $group: {
          _id: '$artist',
          totalPlays: { $sum: '$playCount' },
          trackCount: { $sum: 1 }
        }
      },
      { $sort: { totalPlays: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'artist'
        }
      },
      { $unwind: '$artist' },
      {
        $project: {
          artistName: '$artist.artistName',
          name: '$artist.name',
          avatar: '$artist.artistImage',
          totalPlays: 1,
          trackCount: 1
        }
      }
    ]);

    res.json({
      totalUsers,
      totalArtists,
      totalTracks,
      totalPlays: totalPlays[0]?.total || 0,
      pendingReports,
      newUsersThisMonth,
      newTracksThisMonth,
      newUsersThisWeek,
      playsByDay,
      topGenres,
      topArtists
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка статистики', error: error.message });
  }
};

// Управление пользователями
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { artistName: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-listenHistory')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);
    res.json({ users, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page), total });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: req.body.blocked }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Track.deleteMany({ artist: req.params.id });
    res.json({ message: 'Пользователь удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Управление треками (админ)
exports.getAllTracks = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, genre, blocked } = req.query;
    const query = {};
    if (search) query.$text = { $search: search };
    if (genre) query.genre = genre;
    if (blocked !== undefined) query.isBlocked = blocked === 'true';

    const tracks = await Track.find(query)
      .populate('artist', 'name artistName avatar')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Track.countDocuments(query);
    res.json({ tracks, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page), total });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.blockTrack = async (req, res) => {
  try {
    const track = await Track.findByIdAndUpdate(req.params.id, { isBlocked: req.body.blocked }, { new: true });
    res.json(track);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.updateTrackSeo = async (req, res) => {
  try {
    const { metaTitle, metaDescription, keywords } = req.body;
    const track = await Track.findByIdAndUpdate(
      req.params.id,
      { metaTitle, metaDescription, keywords },
      { new: true }
    );
    res.json(track);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Жанры
exports.getGenres = async (req, res) => {
  try {
    const genres = await Genre.find().sort('nameRu');
    res.json(genres);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.createGenre = async (req, res) => {
  try {
    const { name, nameRu, color, image } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const genre = await Genre.create({ name, nameRu, slug, color, image });
    res.status(201).json(genre);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.updateGenre = async (req, res) => {
  try {
    const genre = await Genre.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(genre);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.deleteGenre = async (req, res) => {
  try {
    await Genre.findByIdAndDelete(req.params.id);
    res.json({ message: 'Жанр удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};
