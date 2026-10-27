import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, MapPin, Users } from 'lucide-react';
import { CompanyAvatar } from '../common/Avatar';
import { Badge, DeadlineChip } from '../common/Badges';
import { formatPackage } from '../../utils/format';
import { jobTypeLabel } from '../../utils/constants';

export function EligibilityBadge({ drive }) {
  if (drive.hasApplied) return <Badge tone="success" icon={CheckCircle2}>Applied</Badge>;
  if (drive.isEligible) return <Badge tone="primary">Eligible</Badge>;
  return <Badge tone="neutral">Not eligible</Badge>;
}

export default function DriveCard({ drive, to }) {
  return (
    <Link to={to || `/student/drives/${drive._id}`} className="card card--interactive drive-card">
      <div className="drive-card__head">
        <CompanyAvatar name={drive.companyName} size="lg" />
        <div className="drive-card__title">
          <h3>{drive.companyName}</h3>
          <p>{drive.role}</p>
        </div>
        {drive.isEligible !== undefined && <EligibilityBadge drive={drive} />}
      </div>

      <p className="drive-card__package">
        {formatPackage(drive.package)}
        <span>{drive.jobType === 'internship' ? 'stipend (annualised)' : 'CTC'}</span>
      </p>

      <ul className="meta-list">
        {drive.location && (
          <li>
            <MapPin size={15} aria-hidden="true" />
            {drive.location}
          </li>
        )}
        <li>
          <Briefcase size={15} aria-hidden="true" />
          {jobTypeLabel(drive.jobType)}
        </li>
        <li>
          <Users size={15} aria-hidden="true" />
          {drive.applicantCount} applied
        </li>
      </ul>

      <div className="drive-card__foot">
        <DeadlineChip deadline={drive.deadline} />
      </div>
    </Link>
  );
}
