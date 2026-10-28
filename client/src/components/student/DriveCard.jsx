import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, MapPin, Users } from 'lucide-react';
import { CompanyAvatar } from '../common/Avatar';
import { Badge, DeadlineChip, TierBadge } from '../common/Badges';
import MatchRing from '../common/MatchRing';
import { formatPackage, timeLeft } from '../../utils/format';
import { jobTypeLabel } from '../../utils/constants';

export function EligibilityBadge({ drive }) {
  if (drive.hasApplied) return <Badge tone="success" icon={CheckCircle2}>Applied</Badge>;
  if (drive.isEligible) return <Badge tone="lime">Eligible</Badge>;
  return <Badge tone="neutral">Not eligible</Badge>;
}

// Drive as a "ticket": company on top, a perforated tear line, then package and deadline.
export default function DriveCard({ drive, to }) {
  const urgency = timeLeft(drive.deadline).urgency;
  const sticker = drive.hasApplied ? null : urgency === 'danger' ? 'Closing today' : urgency === 'warning' ? 'Closing soon' : null;
  const showMatch = drive.matchScore !== undefined;

  return (
    <Link to={to || `/student/drives/${drive._id}`} className={`ticket ${drive.hasApplied ? 'ticket--applied' : ''}`}>
      {sticker && <span className={`sticker sticker--corner ${urgency === 'danger' ? 'sticker--coral' : 'sticker--lime'}`}>{sticker}</span>}
      <div className="ticket__top">
        <CompanyAvatar name={drive.companyName} size="lg" />
        <div className="ticket__title">
          <h3>{drive.companyName}</h3>
          <p>{drive.role}</p>
          <span className="ticket__badges">
            {drive.isEligible !== undefined && <EligibilityBadge drive={drive} />}
            <TierBadge tier={drive.tier} />
          </span>
        </div>
        {showMatch && <MatchRing score={drive.matchScore} size={58} />}
      </div>

      {showMatch && drive.matchReasons?.[0] && <p className="ticket__reason">✦ {drive.matchReasons[0]}</p>}

      <div className="ticket__tear" aria-hidden="true" />

      <div className="ticket__bottom">
        <p className="ticket__package">
          {formatPackage(drive.package)}
          <span>{drive.jobType === 'internship' ? 'stipend, annualised' : 'CTC'}</span>
        </p>
        <ul className="meta-list">
          {drive.location && (
            <li>
              <MapPin size={14} aria-hidden="true" />
              {drive.location}
            </li>
          )}
          <li>
            <Briefcase size={14} aria-hidden="true" />
            {jobTypeLabel(drive.jobType)}
          </li>
          <li>
            <Users size={14} aria-hidden="true" />
            {drive.applicantCount} applied
          </li>
        </ul>
        <DeadlineChip deadline={drive.deadline} />
      </div>
    </Link>
  );
}
