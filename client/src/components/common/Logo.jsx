export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <rect width="32" height="32" rx="9" className="logo-mark__bg" />
      <path d="M9 24V8h7.5a5 5 0 0 1 0 10H13" fill="none" className="logo-mark__track" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="23" r="3" className="logo-mark__dot" />
    </svg>
  );
}

export default function Logo({ size = 32, subtitle }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo__text">
        <span className="logo__name">
          placement<span className="logo__accent">track</span>
        </span>
        {subtitle && <span className="logo__subtitle">{subtitle}</span>}
      </span>
    </span>
  );
}
