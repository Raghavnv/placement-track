// Dates in notification text, in Indian time (the server may run in UTC).
const formatDeadline = (date) =>
  new Date(date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

module.exports = { formatDeadline };
