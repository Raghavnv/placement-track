import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus, PenLine, Sparkles, TrainTrack } from 'lucide-react';
import Button from '../../components/common/Button';
import MetroLine from '../../components/common/MetroLine';
import MatchRing from '../../components/common/MatchRing';
import { CompanyAvatar } from '../../components/common/Avatar';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '../../components/common/States';
import ReminderPanel from '../../components/student/ReminderPanel';
import AnnouncementsPanel from '../../components/student/AnnouncementsPanel';
import ProfileCard from '../../components/student/ProfileCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { downloadCalendar, getMyApplications, getReminders } from '../../services/applicationService';
import { listDrives } from '../../services/driveService';
import { REMINDER_DAYS } from '../../utils/constants';
import { firstName, formatPackage, greeting, pluralize } from '../../utils/format';
import { PIPELINE, STAGE_LABELS } from '../../utils/stages';

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

function headline(reminders, counts) {
  if (counts.offer) return { lead: 'You have', mark: pluralize(counts.offer, 'offer'), tail: 'in hand. Legend.' };
  if (reminders.deadlines.length) return { lead: 'You have', mark: pluralize(reminders.deadlines.length, 'deadline'), tail: 'this week.' };
  if (counts.interview) return { lead: "You're", mark: 'one round away', tail: 'from an offer.' };
  return { lead: "Let's find your", mark: 'next drive.', tail: '' };
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { download, downloading } = useCalendarDownload();

  const { data, error, loading, reload } = useAsync(
    () =>
      Promise.all([getMyApplications(), getReminders(REMINDER_DAYS), listDrives({ sort: 'match', limit: 20 })]).then(
        ([applications, reminders, drives]) => ({ applications, reminders, drives }),
      ),
    [],
  );

  const counts = data?.applications.countsByStage;
  const topMatches = data?.drives.data.filter((d) => !d.hasApplied && d.isEligible).slice(0, 3) || [];
  const copy = data ? headline(data.reminders, counts) : null;
  const stations = PIPELINE.map((stage) => ({ key: stage, label: STAGE_LABELS[stage], count: counts?.[stage] ?? 0, reached: (counts?.[stage] ?? 0) > 0 }));

  return (
    <div className="page page--wide">
      {error && <ErrorState error={error} onRetry={reload} />}

      <div className="bento">
        <section className="bento__hero hero">
          <p className="hero__eyebrow">
            <Sparkles size={14} aria-hidden="true" /> {greeting()}, {firstName(user.name)}
          </p>
          <h1 className="hero__title">
            {copy ? (
              <>
                {copy.lead} <mark>{copy.mark}</mark> {copy.tail}
              </>
            ) : (
              <Skeleton width="80%" height={44} className="skeleton--on-ink" />
            )}
          </h1>
          <div className="hero__actions">
            <Button as={Link} to="/student/drives" variant="lime" iconRight={ArrowRight}>
              See my matches
            </Button>
            <Button variant="ghost-on-ink" icon={CalendarPlus} onClick={download} loading={downloading}>
              Sync to calendar
            </Button>
          </div>
          <span className="hero__ring" aria-hidden="true" />
          <span className="hero__ring hero__ring--2" aria-hidden="true" />
        </section>

        <section className="bento__track card" aria-labelledby="track-title">
          <header className="card__header">
            <span className="card__icon card__icon--lime" aria-hidden="true">
              <TrainTrack size={18} />
            </span>
            <div>
              <h2 id="track-title" className="card__title">Your track</h2>
              <p className="card__subtitle">
                {counts ? `${pluralize(data.applications.data.length, 'application')} · ${counts.rejected} not selected` : 'Loading…'}
              </p>
            </div>
            <Link to="/student/applications" className="text-link card__action">
              Board <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </header>
          <MetroLine stations={stations} linkTo="/student/applications" />
        </section>

        <AnnouncementsPanel className="bento__updates" />

        <div className="bento__reminders">
          {loading && !data ? <CardSkeleton lines={4} /> : data && <ReminderPanel reminders={data.reminders} days={REMINDER_DAYS} />}
        </div>

        <section className="bento__matches card" aria-labelledby="matches-title">
          <header className="card__header">
            <span className="card__icon card__icon--coral" aria-hidden="true">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 id="matches-title" className="card__title">Top matches for you</h2>
              <p className="card__subtitle">Eligible, not applied yet</p>
            </div>
            <Link to="/student/drives" className="text-link card__action">
              All <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </header>
          {loading && !data ? (
            <Skeleton height={180} radius={12} />
          ) : topMatches.length ? (
            <ol className="top-matches">
              {topMatches.map((drive) => (
                <li key={drive._id}>
                  <Link to={`/student/drives/${drive._id}`} className="top-match">
                    <CompanyAvatar name={drive.companyName} />
                    <span className="top-match__text">
                      <strong>{drive.companyName}</strong>
                      <span>
                        {drive.role} · {formatPackage(drive.package)}
                      </span>
                      {drive.matchReasons?.[0] && <small>✦ {drive.matchReasons[0]}</small>}
                    </span>
                    <MatchRing score={drive.matchScore} size={50} label={false} />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            data && (
              <EmptyState
                compact
                icon={Sparkles}
                title="You've applied everywhere you can"
                description="New drives are ranked for you the moment they're posted."
              />
            )
          )}
        </section>

        <div className="bento__profile">
          <ProfileCard user={user} />
          <Button as={Link} to="/onboarding?edit=1" variant="secondary" block icon={PenLine}>
            Edit skills & preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
