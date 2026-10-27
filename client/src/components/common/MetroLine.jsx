import { Link } from 'react-router-dom';

// The signature "track": stations on a line. Used for the student pipeline and onboarding progress.
export default function MetroLine({ stations, current, compact = false, linkTo }) {
  const currentIndex = stations.findIndex((s) => s.key === current);
  return (
    <ol className={`metro ${compact ? 'metro--compact' : ''}`}>
      {stations.map((station, i) => {
        const state = currentIndex === -1 ? (station.reached ? 'done' : 'todo') : i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo';
        const content = (
          <>
            <span className="metro__stop" aria-hidden="true">
              {station.count !== undefined ? <span className="metro__count">{station.count}</span> : null}
            </span>
            <span className="metro__label">{station.label}</span>
            {station.count !== undefined && <span className="sr-only">: {station.count}</span>}
          </>
        );
        return (
          <li
            key={station.key}
            className={`metro__station metro__station--${station.tone || station.key} is-${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            {linkTo ? (
              <Link to={linkTo} className="metro__link">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
