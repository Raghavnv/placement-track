export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id="pt-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#pt-logo)" />
      <path d="M10 23V9h6.5a4.5 4.5 0 0 1 0 9H13" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22.5" cy="22.5" r="2.4" fill="#fff" />
    </svg>
  );
}

export default function Logo({ size = 32, subtitle }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo__text">
        <span className="logo__name">
          Placement<span className="logo__accent">Track</span>
        </span>
        {subtitle && <span className="logo__subtitle">{subtitle}</span>}
      </span>
    </span>
  );
}
