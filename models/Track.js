const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artistName: { type: String, required: true, index: true },
  album: { type: String, default: '' },
  genre: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  audioFile: { type: String, required: true },
  duration: { type: Number, default: 0 },

  // Статистика
  playCount: { type: Number, default: 0 },
  likesCount: { type: Number, default: 0 },
  dislikesCount: { type: Number, default: 0 },
  savesCount: { type: Number, default: 0 },

  // Рейтинг
  ratings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    value: { type: Number, min: 1, max: 5 }
  }],
  averageRating: { type: Number, default: 0 },

  // SEO
  slug: { type: String, unique: true },
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  keywords: [{ type: String }],

  isPublished: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

// Автогенерация slug
trackSchema.pre('save', function() {
  if (!this.slug || this.isModified('title') || this.isModified('artistName')) {
    const base = `${this.artistName}-${this.title}`
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    this.slug = `${base}-${this._id}`;
  }
  if (!this.metaTitle) {
    this.metaTitle = `${this.title} — ${this.artistName} | Aridai Music`;
  }
  if (!this.metaDescription) {
    this.metaDescription = `Слушайте ${this.title} от ${this.artistName} на Aridai Music. ${this.description}`.slice(0, 160);
  }
});

trackSchema.index({ title: 'text', artistName: 'text', album: 'text', description: 'text' });

module.exports = mongoose.model('Track', trackSchema);
