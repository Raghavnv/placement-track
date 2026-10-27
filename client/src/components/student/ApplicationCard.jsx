import { NotebookPen } from 'lucide-react';
import { CompanyAvatar } from '../common/Avatar';
import { StageBadge } from '../common/Badges';
import { PIPELINE, STAGE_LABELS, reachedStages, rejectedAt } from '../../utils/stages';
import { formatPackage, timeAgo } from '../../utils/format';

function ProgressDots({ application }) {
  const reached = reachedStages(application);
  const rejected = application.stage === 'rejected';
  const stopAt = rejected ? rejectedAt(application) : null;
  return (
    <ol className="mini-track" aria-label="Progress">
      {PIPELINE.map((stage) => {
        const isReached = reached.has(stage);
        const isStop = stage === stopAt;
        return (
          <li
            key={stage}
            className={`mini-track__stop ${isReached ? `is-reached is-${stage}` : ''} ${isStop ? 'is-stop' : ''}`}
            title={STAGE_LABELS[stage]}
          >
            <span className="sr-only">
              {STAGE_LABELS[stage]}: {isReached ? 'reached' : 'not reached'}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function ApplicationCard({ application, onOpen }) {
  const { drive } = application;
  const final = application.stage === 'offer' || application.stage === 'rejected';
  return (
    <button type="button" className={`kanban-card kanban-card--${application.stage}`} onClick={() => onOpen(application)}>
      <span className="kanban-card__head">
        <CompanyAvatar name={drive.companyName} size="sm" />
        <span className="kanban-card__title">
          <strong>{drive.companyName}</strong>
          <span>{drive.role}</span>
        </span>
      </span>
      {final && (
        <span className="kanban-card__result">
          <StageBadge stage={application.stage} size="sm" />
          {application.stage === 'rejected' && <span className="muted">at {STAGE_LABELS[rejectedAt(application)]}</span>}
        </span>
      )}
      <span className="kanban-card__package">{formatPackage(drive.package)}</span>
      <ProgressDots application={application} />
      <span className="kanban-card__foot">
        <span>Updated {timeAgo(application.updatedAt)}</span>
        {application.notes && (
          <span className="kanban-card__notes" title="Has prep notes">
            <NotebookPen size={14} aria-hidden="true" />
            <span className="sr-only">Has notes</span>
          </span>
        )}
      </span>
    </button>
  );
}
