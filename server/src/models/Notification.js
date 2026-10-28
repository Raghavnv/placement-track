const mongoose = require('mongoose');

const TYPES = ['stage', 'announcement', 'drive'];

// In-app notifications (the bell). MongoDB deletes them after 90 days.
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: TYPES, required: true },
  title: { type: String, required: true, maxlength: 160 },
  body: { type: String, maxlength: 500, default: '' },
  link: { type: String, maxlength: 200, default: '' }, // a client path, e.g. /student/drives/<id>
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, expires: 90 * 24 * 60 * 60 },
});

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.TYPES = TYPES;
