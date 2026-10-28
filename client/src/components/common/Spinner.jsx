export default function Spinner({ size = 'md', label }) {
  return (
    <span className={`spinner spinner--${size}`} role={label ? 'status' : undefined} aria-label={label}>
      <span className="spinner__ring" aria-hidden="true" />
    </span>
  );
}

export function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="full-page-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}
