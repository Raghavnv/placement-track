import { TrendingDown } from 'lucide-react';
import { formatNumber } from '../../utils/format';

// Where students drop off: how many applications ever reached each round.
export default function FunnelChart({ funnel }) {
  const applied = funnel[0]?.reached || 0;
  if (!applied) return <p className="muted">No applications yet. The funnel appears once students apply.</p>;

  return (
    <ol className="funnel">
      {funnel.map((step, i) => {
        const previous = funnel[i - 1];
        const drop = previous && previous.reached ? Math.round(((previous.reached - step.reached) / previous.reached) * 100) : null;
        return (
          <li key={step.stage} className={`funnel__step funnel__step--${step.stage}`}>
            {drop !== null && drop > 0 && (
              <span className="funnel__drop">
                <TrendingDown size={13} aria-hidden="true" /> {drop}% didn't progress
              </span>
            )}
            <div className="funnel__row">
              <span className="funnel__label">{step.label}</span>
              <span className="funnel__value">
                <strong>{formatNumber(step.reached)}</strong> · {step.percentOfApplied}%
              </span>
            </div>
            <span className="funnel__track" aria-hidden="true">
              <span className="funnel__bar" style={{ width: `${Math.max(step.percentOfApplied, 2)}%` }} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
