import { hueFor, initials } from '../../utils/format';

// Company monogram with a stable colour per company name.
export function CompanyAvatar({ name, size = 'md' }) {
  return (
    <span className={`avatar avatar--company avatar--${size}`} style={{ '--avatar-hue': hueFor(name) }} aria-hidden="true">
      {initials(name) || '?'}
    </span>
  );
}

export function UserAvatar({ name, size = 'md' }) {
  return (
    <span className={`avatar avatar--user avatar--${size}`} style={{ '--avatar-hue': hueFor(name) }} aria-hidden="true">
      {initials(name) || '?'}
    </span>
  );
}
