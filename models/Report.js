const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  track: { type: mongoose.Schema.Types.ObjectId, ref: 'Track', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, minlength: 10 },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'dismissed'], default: 'pending' },
  adminNote: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
