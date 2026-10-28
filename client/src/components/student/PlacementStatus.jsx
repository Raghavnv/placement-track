import { Award, Info } from 'lucide-react';
import { TierBadge } from '../common/Badges';
import useAsync from '../../hooks/useAsync';
import { getMyPlacement } from '../../services/placementService';
import { formatPackage } from '../../utils/format';

// The student's offer and what the placement policy still lets them apply to.
// variant "card" for the profile; "notice" is a one-line banner shown only once they're placed.
export default function PlacementStatus({ variant = 'card' }) {
  const { data } = useAsync(getMyPlacement, []);
  if (!data) return null;
  const { placement, tiers } = data;

  if (variant === 'notice') {
    if (!placement.placed) return null;
    return (
      <p className="jobs-note placement-notice">
        <Award size={16} aria-hidden="true" />
        {placement.message}
      </p>
    );
  }

  return (
    <section className="card placement-status" aria-labelledby="placement-title">
      <h2 id="placement-title" className="card__title">
        <Award size={18} aria-hidden="true" /> Placement status
      </h2>
      {placement.placed ? (
        <>
          <p className="placement-status__offer">
            <strong>{placement.offer.companyName}</strong>
            <span>
              {placement.offer.role} · {formatPackage(placement.offer.package)}
            </span>
            <TierBadge tier={placement.offer.tier} />
          </p>
          <p className="placement-status__rule">{placement.message}</p>
        </>
      ) : (
        <p className="placement-status__rule">Not placed yet. Every drive you're eligible for is open to you.</p>
      )}
      <ul className="placement-status__tiers" aria-label="Drive tiers">
        {tiers.map((t) => (
          <li key={t.key}>
            <TierBadge tier={t.key} />
            <span>{t.maxPackage ? `₹${t.minPackage}–${t.maxPackage} LPA` : `₹${t.minPackage} LPA +`}</span>
          </li>
        ))}
      </ul>
      {!data.policy.enabled && (
        <p className="coach-meta">
          <Info size={13} aria-hidden="true" /> The offer policy is switched off this season.
        </p>
      )}
    </section>
  );
}
