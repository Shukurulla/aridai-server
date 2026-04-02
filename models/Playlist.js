const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  isPublic: { type: Boolean, default: false },
  // Системные плейлисты (хиты, рекомендации и т.д.)
  isSystem: { type: Boolean, default: false },
  systemType: { type: String, enum: ['hits', 'new', 'recommended', 'genre', null], default: null },
}, { timestamps: true });

module.exports = mongoose.model('Playlist', playlistSchema);
