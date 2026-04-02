const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  nameRu: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  image: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
  trackCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Genre', genreSchema);
