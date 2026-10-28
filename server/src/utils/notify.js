const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('./email');

// Creates in-app notifications for these users, then emails those who haven't opted out in the background
// (the request doesn't wait for the email). Never throws: a failed notification must not undo the action.
async function notify(userIds, { type, title, body = '', link = '' }) {
  const ids = [...new Set(userIds.map(String))];
  if (!ids.length) return;
  try {
    await Notification.insertMany(ids.map((user) => ({ user, type, title, body, link })));
  } catch (error) {
    console.error(`Notifications not saved: ${error.message}`);
    return;
  }
  User.find({ _id: { $in: ids }, emailNotifications: { $ne: false } })
    .select('name email')
    .lean()
    .then((recipients) => sendEmail(recipients, { title, body, link }))
    .catch((error) => console.error(`Notification email failed: ${error.message}`));
}

module.exports = { notify };
