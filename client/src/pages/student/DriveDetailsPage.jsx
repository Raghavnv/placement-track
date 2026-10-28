import { useParams } from 'react-router-dom';
import { Briefcase, MapPin, SearchX, ShieldCheck, Sparkles, Tag, Users } from 'lucide-react';
import MatchRing from '../../components/common/MatchRing';
import PageHeader from '../../components/common/PageHeader';
import { CompanyAvatar } from '../../components/common/Avatar';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/States';
import { EligibilityBadge } from '../../components/student/DriveCard';
import EligibilityChecklist from '../../components/student/EligibilityChecklist';
import ApplyPanel from '../../components/student/ApplyPanel';
import AnnouncementsPanel from '../../components/student/AnnouncementsPanel';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { getDrive } from '../../services/driveService';
import { jobTypeLabel } from '../../utils/constants';

export default function DriveDetailsPage() {
  const { id } = useParams();
  const { data: drive, error, loading, reload } = useAsync(() => getDrive(id), [id]);
  useDocumentTitle(drive ? `${drive.companyName} · ${drive.role}` : 'Drive');

  const back = { to: '/student/drives', label: 'All drives' };

  if (error?.status === 404 || error?.code === 'INVALID_ID') {
    return (
      <div className="page">
        <PageHeader title="Drive not found" back={back} />
        <div className="card">
          <EmptyState icon={SearchX} title="This drive doesn't exist" description="It may have been removed by the placement cell." />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title={drive ? drive.companyName : 'Loading drive…'} back={back} />
      {error && <ErrorState error={error} onRetry={reload} />}

      {loading && !drive ? (
        <div className="details-layout">
          <CardSkeleton lines={6} />
          <CardSkeleton lines={3} />
        </div>
      ) : (
        drive && (
          <div className="details-layout">
            <div className="details-main">
              <section className="card details-hero">
                <CompanyAvatar name={drive.companyName} size="xl" />
                <div className="details-hero__text">
                  <h2>{drive.role}</h2>
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
                </div>
                <EligibilityBadge drive={drive} />
              </section>

              {drive.hasApplied && <AnnouncementsPanel driveId={drive._id} title="Updates from the placement cell" preview={5} />}

              <section className="card match-panel" aria-labelledby="match-title">
                <MatchRing score={drive.matchScore} size={88} />
                <div>
                  <h2 id="match-title" className="card__title">
                    <Sparkles size={16} aria-hidden="true" /> Why it's a {drive.matchScore >= 60 ? 'strong' : 'possible'} match
                  </h2>
                  {drive.matchReasons?.length ? (
                    <ul className="reason-list">
                      {drive.matchReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Add skills and roles to your profile to see why drives fit you.</p>
                  )}
                  {drive.skills?.length > 0 && (
                    <ul className="mini-chips" aria-label="Skills the company is looking for">
                      {drive.skills.map((s) => (
                        <li key={s}>
                          <Tag size={11} aria-hidden="true" /> {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="card" aria-labelledby="eligibility-title">
                <header className="card__header">
                  <span className={`card__icon ${drive.isEligible ? 'card__icon--success' : 'card__icon--danger'}`} aria-hidden="true">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <h2 id="eligibility-title" className="card__title">Eligibility</h2>
                    <p className="card__subtitle">
                      {drive.isEligible ? 'You meet every criterion.' : "You don't meet every criterion yet."}
                    </p>
                  </div>
                </header>
                <EligibilityChecklist checks={drive.eligibilityChecks} />
              </section>

              <section className="card" aria-labelledby="about-title">
                <h2 id="about-title" className="card__title">About the role</h2>
                <p className="prose">{drive.description || 'The placement cell has not added a description yet.'}</p>
              </section>
            </div>

            <aside className="details-aside">
              <ApplyPanel drive={drive} onApplied={reload} />
            </aside>
          </div>
        )
      )}
    </div>
  );
}
