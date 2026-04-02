const Playlist = require('../models/Playlist');

exports.createPlaylist = async (req, res) => {
  try {
    const { title, description, isPublic } = req.body;
    const playlist = await Playlist.create({
      title,
      description,
      isPublic,
      user: req.user._id,
      coverImage: req.file ? `/uploads/covers/${req.file.filename}` : ''
    });
    res.status(201).json(playlist);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.getMyPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user._id })
      .populate('tracks')
      .sort('-updatedAt');
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.getPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate({
        path: 'tracks',
        populate: { path: 'artist', select: 'name artistName avatar artistImage' }
      })
      .populate('user', 'name avatar');
    if (!playlist) return res.status(404).json({ message: 'Плейлист не найден' });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.addTrackToPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $addToSet: { tracks: req.body.trackId } },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ message: 'Плейлист не найден' });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.removeTrackFromPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $pull: { tracks: req.params.trackId } },
      { new: true }
    );
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.deletePlaylist = async (req, res) => {
  try {
    await Playlist.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Плейлист удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};
