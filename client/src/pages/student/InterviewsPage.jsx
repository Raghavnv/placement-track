import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ChevronRight, Globe, MessagesSquare } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/States';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { listInterviews } from '../../services/interviewService';
import { formatDate } from '../../utils/format';

const PAGE_SIZE = 10;
const VERDICT_TONES = { strong: 'high', borderline: 'mid', 'not-yet': 'low' };

export default function InterviewsPage() {
  useDocumentTitle('Mock interviews');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => listInterviews({ page, limit: PAGE_SIZE }), [page]);

  return (
    <div className="page">
      <PageHeader
        title="Mock interviews"
        description="Five questions written from the job posting and your resume, pitched at the company's level, then a graded report."
      />

      <section className="card interview-how">
        <ol>
          <li>
            <strong>Pick a role.</strong> Open any drive or job and press <em>Practice interview</em>.
          </li>
          <li>
            <strong>Answer 5 questions.</strong> Technical deep-dives, a scenario, your project and a behavioural one. Type or dictate.
          </li>
          <li>
            <strong>Get your report.</strong> A score, an honest call on whether you'd clear the round, and what a strong answer covers.
          </li>
        </ol>
        <div className="interview-how__actions">
          <Button as={Link} to="/student/drives" icon={Briefcase}>
            Practise for a drive
          </Button>
          <Button as={Link} to="/student/jobs" variant="secondary" icon={Globe}>
            Practise for a job
          </Button>
        </div>
      </section>

      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !data ? (
        <CardSkeleton lines={3} />
      ) : data?.data.length ? (
        <section className="card" aria-labelledby="past-title">
          <h2 id="past-title" className="card__title">Your interviews</h2>
          <ul className="interview-list">
            {data.data.map((s) => (
              <li key={s._id}>
                <Link to={`/student/interviews/${s._id}`} className="interview-list__item">
                  <span className="interview-list__text">
                    <strong>{s.target.title}</strong>
                    <small>
                      {s.target.level} · {formatDate(s.createdAt)}
                    </small>
                  </span>
                  {s.status === 'completed' ? (
                    <span className={`interview-list__result interview-verdict--${VERDICT_TONES[s.report.verdict]}`}>
                      <strong>{s.report.overallScore}</strong>/100 · {s.report.verdictLabel}
                    </span>
                  ) : (
                    <span className="badge badge--tone-neutral">In progress</span>
                  )}
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        data && (
          <div className="card">
            <EmptyState icon={MessagesSquare} title="No interviews yet" description="Your first mock interview takes about 15 minutes. Pick a drive to start." compact />
          </div>
        )
      )}
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  );
}
