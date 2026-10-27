import { AlertTriangle, RotateCw } from 'lucide-react';
import Button from './Button';

export function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'empty-state--compact' : ''}`}>
      {Icon && (
        <span className="empty-state__icon" aria-hidden="true">
          <Icon size={compact ? 22 : 28} />
        </span>
      )}
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Couldn't load this" }) {
  return (
    <div className="error-state" role="alert">
      <AlertTriangle size={20} aria-hidden="true" />
      <div className="error-state__text">
        <strong>{title}</strong>
        <span>{error?.message || 'Something went wrong. Please try again.'}</span>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RotateCw} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 16, radius, className = '' }) {
  return <span className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card card-skeleton" aria-hidden="true">
      <div className="card-skeleton__head">
        <Skeleton width={44} height={44} radius={12} />
        <div className="card-skeleton__lines">
          <Skeleton width="60%" />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={`${90 - i * 15}%`} height={12} />
      ))}
    </div>
  );
}

export function InlineAlert({ tone = 'danger', icon: Icon = AlertTriangle, children }) {
  return (
    <div className={`inline-alert inline-alert--${tone}`} role="alert">
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
