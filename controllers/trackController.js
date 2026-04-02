const Track = require('../models/Track');
const User = require('../models/User');
const Genre = require('../models/Genre');

// Загрузить трек (артист)
exports.uploadTrack = async (req, res) => {
  try {
    const { title, genre, album, description, keywords } = req.body;

    if (!req.files?.audio?.[0]) {
      return res.status(400).json({ message: 'Аудиофайл обязателен' });
    }

    const track = await Track.create({
      title,
      artist: req.user._id,
      artistName: req.user.artistName || req.user.name,
      genre,
      album: album || '',
      description: description || '',
      coverImage: req.files.cover?.[0] ? `/uploads/covers/${req.files.cover[0].filename}` : '',
      audioFile: `/uploads/tracks/${req.files.audio[0].filename}`,
      keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
    });

    // Обновить счётчик жанра
    await Genre.findOneAndUpdate({ name: genre }, { $inc: { trackCount: 1 } });

    res.status(201).json(track);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки трека', error: error.message });
  }
};

// Получить все треки (с фильтрами)
exports.getTracks = async (req, res) => {
  try {
    const { page = 1, limit = 20, genre, search, sort = '-createdAt' } = req.query;
    const query = { isPublished: true, isBlocked: false };

    if (genre) query.genre = genre;
    if (search) {
      query.$text = { $search: search };
    }

    const tracks = await Track.find(query)
      .populate('artist', 'name artistName avatar artistImage')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Track.countDocuments(query);

    res.json({
      tracks,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения треков', error: error.message });
  }
};

// Получить трек по slug (SEO)
exports.getTrackBySlug = async (req, res) => {
  try {
    const track = await Track.findOne({ slug: req.params.slug })
      .populate('artist', 'name artistName avatar artistImage');
    if (!track) return res.status(404).json({ message: 'Трек не найден' });
    res.json(track);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Получить трек по ID
exports.getTrackById = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id)
      .populate('artist', 'name artistName avatar artistImage');
    if (!track) return res.status(404).json({ message: 'Трек не найден' });
    res.json(track);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Воспроизведение трека (увеличить счётчик)
exports.playTrack = async (req, res) => {
  try {
    const track = await Track.findByIdAndUpdate(
      req.params.id,
      { $inc: { playCount: 1 } },
      { new: true }
    );
    if (!track) return res.status(404).json({ message: 'Трек не найден' });

    // Добавить в историю прослушивания
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          listenHistory: {
            $each: [{ track: track._id }],
            $position: 0,
            $slice: 500
          }
        }
      });
    }

    res.json({ playCount: track.playCount });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Лайк / Дизлайк
exports.likeTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);
    const isLiked = user.likedTracks.includes(id);

    if (isLiked) {
      await User.findByIdAndUpdate(userId, { $pull: { likedTracks: id } });
      await Track.findByIdAndUpdate(id, { $inc: { likesCount: -1 } });
    } else {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { likedTracks: id },
        $pull: { dislikedTracks: id }
      });
      await Track.findByIdAndUpdate(id, { $inc: { likesCount: 1, dislikesCount: user.dislikedTracks.includes(id) ? -1 : 0 } });
    }

    res.json({ liked: !isLiked });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.dislikeTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);
    const isDisliked = user.dislikedTracks.includes(id);

    if (isDisliked) {
      await User.findByIdAndUpdate(userId, { $pull: { dislikedTracks: id } });
      await Track.findByIdAndUpdate(id, { $inc: { dislikesCount: -1 } });
    } else {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { dislikedTracks: id },
        $pull: { likedTracks: id }
      });
      await Track.findByIdAndUpdate(id, { $inc: { dislikesCount: 1, likesCount: user.likedTracks.includes(id) ? -1 : 0 } });
    }

    res.json({ disliked: !isDisliked });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Сохранить трек
exports.saveTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    const isSaved = user.savedTracks.includes(id);

    if (isSaved) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { savedTracks: id } });
      await Track.findByIdAndUpdate(id, { $inc: { savesCount: -1 } });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedTracks: id } });
      await Track.findByIdAndUpdate(id, { $inc: { savesCount: 1 } });
    }

    res.json({ saved: !isSaved });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Оценить трек (звёзды)
exports.rateTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    if (!value || value < 1 || value > 5) {
      return res.status(400).json({ message: 'Оценка от 1 до 5' });
    }

    const track = await Track.findById(id);
    if (!track) return res.status(404).json({ message: 'Трек не найден' });

    const existingIndex = track.ratings.findIndex(r => r.user.toString() === req.user._id.toString());
    if (existingIndex >= 0) {
      track.ratings[existingIndex].value = value;
    } else {
      track.ratings.push({ user: req.user._id, value });
    }

    track.averageRating = track.ratings.reduce((sum, r) => sum + r.value, 0) / track.ratings.length;
    await track.save();

    res.json({ averageRating: track.averageRating, totalRatings: track.ratings.length });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Хиты (популярные треки)
exports.getHits = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const tracks = await Track.find({ isPublished: true, isBlocked: false })
      .populate('artist', 'name artistName avatar artistImage')
      .sort('-playCount')
      .limit(parseInt(limit));
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Новинки
exports.getNewTracks = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const tracks = await Track.find({ isPublished: true, isBlocked: false })
      .populate('artist', 'name artistName avatar artistImage')
      .sort('-createdAt')
      .limit(parseInt(limit));
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Рекомендации (на основе истории прослушивания)
exports.getRecommendations = async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    let tracks;

    if (req.user) {
      // Получить жанры из истории прослушивания
      const user = await User.findById(req.user._id).populate({
        path: 'listenHistory.track',
        select: 'genre'
      });

      const genreCounts = {};
      user.listenHistory.forEach(h => {
        if (h.track?.genre) {
          genreCounts[h.track.genre] = (genreCounts[h.track.genre] || 0) + 1;
        }
      });

      const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);

      if (topGenres.length > 0) {
        const listenedIds = user.listenHistory.map(h => h.track?._id).filter(Boolean);
        tracks = await Track.find({
          genre: { $in: topGenres },
          _id: { $nin: listenedIds },
          isPublished: true,
          isBlocked: false
        })
          .populate('artist', 'name artistName avatar artistImage')
          .sort('-playCount')
          .limit(parseInt(limit));
      }
    }

    // Фолбэк: популярные треки
    if (!tracks || tracks.length === 0) {
      tracks = await Track.find({ isPublished: true, isBlocked: false })
        .populate('artist', 'name artistName avatar artistImage')
        .sort('-playCount -averageRating')
        .limit(parseInt(limit));
    }

    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Треки артиста
exports.getArtistTracks = async (req, res) => {
  try {
    const tracks = await Track.find({ artist: req.params.artistId, isPublished: true })
      .sort('-createdAt');
    const totalPlays = tracks.reduce((sum, t) => sum + t.playCount, 0);
    res.json({ tracks, totalPlays });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Мои треки (для артиста)
exports.getMyTracks = async (req, res) => {
  try {
    const tracks = await Track.find({ artist: req.user._id }).sort('-createdAt');
    const totalPlays = tracks.reduce((sum, t) => sum + t.playCount, 0);
    res.json({ tracks, totalPlays });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

// Удалить трек
exports.deleteTrack = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ message: 'Трек не найден' });

    if (track.artist.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Нет прав для удаления' });
    }

    await Track.findByIdAndDelete(req.params.id);
    await Genre.findOneAndUpdate({ name: track.genre }, { $inc: { trackCount: -1 } });

    res.json({ message: 'Трек удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка удаления', error: error.message });
  }
};
