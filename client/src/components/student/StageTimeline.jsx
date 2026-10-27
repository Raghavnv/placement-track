import { STAGE_LABELS } from '../../utils/stages';
import { formatDateTime } from '../../utils/format';

export default function StageTimeline({ history }) {
  const events = [...history].reverse();
  return (
    <ol className="timeline">
      {events.map((event, i) => (
        <li key={`${event.stage}-${event.changedAt}`} className={`timeline__item timeline__item--${event.stage} ${i === 0 ? 'is-current' : ''}`}>
          <span className="timeline__dot" aria-hidden="true" />
          <div className="timeline__content">
            <p className="timeline__stage">{STAGE_LABELS[event.stage]}</p>
            <time className="timeline__time" dateTime={event.changedAt}>
              {formatDateTime(event.changedAt)}
            </time>
            {event.remark && <p className="timeline__remark">"{event.remark}"</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
