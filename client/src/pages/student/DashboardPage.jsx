import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus, GraduationCap, Search, Sparkles } from 'lucide-react';
import Button from '../../components/common/Button';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '../../components/common/States';
import DriveCard from '../../components/student/DriveCard';
import ReminderPanel from '../../components/student/ReminderPanel';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { downloadCalendar, getMyApplications, getReminders } from '../../services/applicationService';
import { listDrives } from '../../services/driveService';
import { BRANCH_NAMES, REMINDER_DAYS } from '../../utils/constants';
import { firstName, greeting, pluralize } from '../../utils/format';
import { STAGES, STAGE_LABELS } from '../../utils/stages';

function summarySentence(reminders, counts) {
  const parts = [];
  const urgent = reminders.deadlines.length;
  if (urgent) parts.push(`${pluralize(urgent, 'deadline')} coming up`);
  if (reminders.upcomingDrives.length) parts.push(`${pluralize(reminders.upcomingDrives.length, 'drive day')} ahead`);
  const active = counts.applied + counts.aptitude + counts.interview;
  if (active) parts.push(`${pluralize(active, 'active application')}`);
  if (!parts.length) return 'No deadlines on your plate. A good time to browse new drives.';
  return `You have ${parts.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`;
}

export function useCalendarDownload() {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true);
    try {
      await downloadCalendar();
      toast.success('Calendar downloaded. Open the file to add deadlines to your calendar.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDownloading(false);
    }
  };
  return { download, downloading };
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { download, downloading } = useCalendarDownload();

  const { data, error, loading, reload } = useAsync(
    () =>
      Promise.all([getMyApplications(), getReminders(REMINDER_DAYS), listDrives({ eligibleOnly: true, limit: 12 })]).then(
        ([applications, reminders, drives]) => ({ applications, reminders, drives }),
      ),
    [],
  );

  const recommended = data?.drives.data.filter((d) => !d.hasApplied).slice(0, 3) || [];
  const counts = data?.applications.countsByStage;

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">
            <Sparkles size={14} aria-hidden="true" /> {greeting()}
          </p>
          <h1 className="hero__title">{firstName(user.name)}, let's land that offer.</h1>
          <p className="hero__lead">
            {data ? summarySentence(data.reminders, counts) : <Skeleton width="70%" height={18} className="skeleton--on-brand" />}
          </p>
          <div className="hero__actions">
            <Button as={Link} to="/student/drives" variant="on-brand" icon={Search}>
              Browse drives
            </Button>
            <Button variant="ghost-on-brand" icon={CalendarPlus} onClick={download} loading={downloading}>
              Sync to calendar
            </Button>
          </div>
        </div>
        <div className="hero__decor" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      {error && <ErrorState error={error} onRetry={reload} />}

      <section aria-label="Your pipeline" className="pipeline">
        {STAGES.map((stage) => (
          <Link key={stage} to="/student/applications" className={`pipeline__tile pipeline__tile--${stage}`}>
            <span className="pipeline__count">{counts ? counts[stage] : <Skeleton width={28} height={28} />}</span>
            <span className="pipeline__label">{STAGE_LABELS[stage]}</span>
          </Link>
        ))}
      </section>

      <div className="dashboard-grid">
        {loading && !data ? (
          <CardSkeleton lines={4} />
        ) : (
          data && <ReminderPanel reminders={data.reminders} days={REMINDER_DAYS} />
        )}

        <section className="card profile-card" aria-labelledby="profile-title">
          <header className="card__header">
            <span className="card__icon" aria-hidden="true">
              <GraduationCap size={18} />
            </span>
            <div>
              <h2 id="profile-title" className="card__title">Your eligibility profile</h2>
              <p className="card__subtitle">Drives are matched against this</p>
            </div>
          </header>
          <dl className="profile-card__grid">
            <div>
              <dt>CGPA</dt>
              <dd>{user.cgpa}</dd>
            </div>
            <div>
              <dt>Backlogs</dt>
              <dd>{user.backlogs ?? 0}</dd>
            </div>
            <div>
              <dt>Branch</dt>
              <dd title={BRANCH_NAMES[user.branch]}>{user.branch}</dd>
            </div>
            <div>
              <dt>Batch</dt>
              <dd>{user.graduationYear}</dd>
            </div>
          </dl>
          <p className="profile-card__note">
            {user.rollNumber} · {BRANCH_NAMES[user.branch]}
          </p>
        </section>
      </div>

      <section aria-labelledby="recommended-title">
        <div className="section-head">
          <h2 id="recommended-title" className="section-title">
            Recommended for you
          </h2>
          <Link to="/student/drives?eligible=1" className="text-link">
            See all eligible <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {loading && !data ? (
          <div className="card-grid">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : recommended.length ? (
          <div className="card-grid">
            {recommended.map((drive) => (
              <DriveCard key={drive._id} drive={drive} />
            ))}
          </div>
        ) : (
          data && (
            <div className="card">
              <EmptyState
                compact
                icon={Sparkles}
                title="You've applied to every eligible drive"
                description="New drives show up here as soon as the placement cell posts them."
              />
            </div>
          )
        )}
      </section>
    </div>
  );
}
