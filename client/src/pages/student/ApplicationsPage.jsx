import { Link, useSearchParams } from 'react-router-dom';
import { CalendarPlus, KanbanSquare, Search } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/States';
import KanbanBoard from '../../components/student/KanbanBoard';
import ApplicationDrawer from '../../components/student/ApplicationDrawer';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { getMyApplications } from '../../services/applicationService';
import { pluralize } from '../../utils/format';
import { KANBAN_COLUMNS } from '../../utils/stages';
import { useCalendarDownload } from './DashboardPage';
import { useEffect } from 'react';
import confetti from '../../utils/confetti';

const CELEBRATED_KEY = 'pt_celebrated_offers';

export default function ApplicationsPage() {
  useDocumentTitle('My applications');
  const [params, setParams] = useSearchParams();
  const { download, downloading } = useCalendarDownload();
  const { data, error, loading, reload, setData } = useAsync(getMyApplications, []);

  const openId = params.get('app');
  const selected = data?.data.find((a) => a._id === openId) || null;

  const open = (application) => setParams({ app: application._id });
  const close = () => setParams({}, { replace: true });

  const handleUpdated = (updated) =>
    setData((current) => ({
      ...current,
      data: current.data.map((a) => (a._id === updated._id ? { ...a, notes: updated.notes, updatedAt: updated.updatedAt } : a)),
    }));

  useEffect(() => {
    if (!data) return;
    const offers = data.data.filter((a) => a.stage === 'offer').map((a) => a._id);
    let seen = [];
    try {
      seen = JSON.parse(localStorage.getItem(CELEBRATED_KEY) || '[]');
    } catch {
      seen = [];
    }
    if (offers.some((id) => !seen.includes(id))) {
      confetti();
      try {
        localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...new Set([...seen, ...offers])]));
      } catch {
        // Celebrating again next time is fine.
      }
    }
  }, [data]);

  const total = data?.data.length || 0;
  const offers = data?.countsByStage.offer || 0;

  return (
    <div className="page page--wide">
      <PageHeader
        title="My applications"
        description={
          data
            ? `${pluralize(total, 'application')}${offers ? ` · ${pluralize(offers, 'offer')} 🎉` : ''}. Stages are updated by the placement cell.`
            : 'Your applications by stage.'
        }
        actions={
          <Button variant="secondary" icon={CalendarPlus} onClick={download} loading={downloading}>
            Sync to calendar
          </Button>
        }
      />

      {error && <ErrorState error={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="kanban" aria-hidden="true">
          {KANBAN_COLUMNS.map((c) => (
            <div key={c.key} className="kanban__col">
              <Skeleton height={20} width="50%" />
              <Skeleton height={120} radius={12} />
              <Skeleton height={120} radius={12} />
            </div>
          ))}
        </div>
      ) : total ? (
        <KanbanBoard applications={data.data} onOpen={open} />
      ) : (
        data && (
          <div className="card">
            <EmptyState
              icon={KanbanSquare}
              title="You haven't applied anywhere yet"
              description="Apply to a drive and it shows up here. You can follow it through aptitude, interview and offer."
              action={
                <Button as={Link} to="/student/drives" icon={Search}>
                  Browse drives
                </Button>
              }
            />
          </div>
        )
      )}

      {selected && <ApplicationDrawer application={selected} onClose={close} onUpdated={handleUpdated} />}
    </div>
  );
}
