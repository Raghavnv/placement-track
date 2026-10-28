const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');

const LIMIT = 30;

exports.listNotifications = asyncHandler(async (req, res) => {
  const [data, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id }).select('-__v -user').sort({ createdAt: -1 }).limit(LIMIT).lean(),
    Notification.countDocuments({ user: req.user._id, readAt: null }),
  ]);
  res.json({ data, unreadCount });
});

// Marks the given notifications read, or all of them when no ids are sent.
exports.markRead = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id, readAt: null, ...(req.body.ids ? { _id: { $in: req.body.ids } } : {}) };
  const { modifiedCount } = await Notification.updateMany(filter, { readAt: new Date() });
  res.json({ marked: modifiedCount });
});
