const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const trimNumber = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

export const formatPackage = (lpa) => (lpa || lpa === 0 ? `₹${trimNumber(Number(lpa))} LPA` : '-');
export const formatNumber = (n) => new Intl.NumberFormat('en-IN').format(n ?? 0);

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export const formatShortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '-';

export const formatWeekdayDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Countdown label + urgency used by deadline chips and reminders.
export function timeLeft(deadline, now = Date.now()) {
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return { label: 'Closed', urgency: 'past', hours: 0 };
  const hours = Math.floor(diff / HOUR);
  const days = Math.floor(diff / DAY);
  if (hours < 1) return { label: 'Under 1 hour left', urgency: 'danger', hours };
  if (hours < 24) return { label: `${plural(hours, 'hour')} left`, urgency: 'danger', hours };
  if (hours < 72) return { label: `${plural(days, 'day')} left`, urgency: 'warning', hours };
  return { label: `${plural(days, 'day')} left`, urgency: 'normal', hours };
}

export function timeAgo(value, now = Date.now()) {
  const diff = now - new Date(value).getTime();
  if (diff < 60 * 1000) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return formatShortDate(value);
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export const firstName = (name = '') => name.split(/\s+/)[0];

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Stable hue per company so the same company always gets the same monogram colour.
export function hueFor(text = '') {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 360;
  return hash;
}

// <input type="datetime-local"> works in local time without a timezone suffix.
export function toLocalInputValue(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const pluralize = plural;
