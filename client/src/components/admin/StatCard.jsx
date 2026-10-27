export default function StatCard({ icon: Icon, label, value, hint, tone = 'primary', progress }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div className="stat-card__body">
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">{value}</p>
        {hint && <p className="stat-card__hint">{hint}</p>}
      </div>
      {progress !== undefined && (
        <span className="stat-card__progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, progress)}%` }} />
        </span>
      )}
    </div>
  );
}
