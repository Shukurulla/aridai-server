const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: { type: String, default: '' },
  password: { type: String, default: '' },
  role: { type: String, enum: ['listener', 'artist', 'admin'], default: 'listener' },

  // Поля артиста
  artistName: { type: String, default: '' },
  artistBio: { type: String, default: '' },
  artistImage: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },

  // Избранное и история
  likedTracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  dislikedTracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  savedTracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
  listenHistory: [{
    track: { type: mongoose.Schema.Types.ObjectId, ref: 'Track' },
    listenedAt: { type: Date, default: Date.now }
  }],

  isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
