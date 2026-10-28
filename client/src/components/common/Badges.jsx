import { Clock } from 'lucide-react';
import { STAGE_LABELS } from '../../utils/stages';
import { formatDateTime, timeLeft } from '../../utils/format';

export function StageBadge({ stage, size = 'md' }) {
  return (
    <span className={`badge badge--${stage} badge--${size}`}>
      <span className="badge__dot" aria-hidden="true" />
      {STAGE_LABELS[stage] || stage}
    </span>
  );
}

export function Badge({ tone = 'neutral', icon: Icon, children }) {
  return (
    <span className={`badge badge--tone-${tone}`}>
      {Icon && <Icon size={14} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function DeadlineChip({ deadline, compact = false }) {
  const { label, urgency } = timeLeft(deadline);
  return (
    <span className={`chip chip--${urgency}`} title={`Deadline: ${formatDateTime(deadline)}`}>
      <Clock size={14} aria-hidden="true" />
      {urgency === 'past' ? (compact ? 'Closed' : `Closed ${formatDateTime(deadline)}`) : label}
    </span>
  );
}
