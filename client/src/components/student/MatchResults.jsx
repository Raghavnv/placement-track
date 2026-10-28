import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, Search, Sparkles } from 'lucide-react';
import Button from '../common/Button';
import MatchRing from '../common/MatchRing';
import { CompanyAvatar } from '../common/Avatar';
import { Badge } from '../common/Badges';
import { formatPackage, firstName, pluralize } from '../../utils/format';
import confetti from '../../utils/confetti';

const SCAN_MS = 2600;

// Phase 1: "scanning" animation that cycles through real drive names. Phase 2: ranked results.
export default function MatchResults({ user, drives, error }) {
  const [phase, setPhase] = useState('scanning');
  const [tick, setTick] = useState(0);
  const names = drives?.map((d) => d.companyName) || ['Infosys', 'Zoho', 'Google', 'TCS', 'Deloitte'];

  useEffect(() => {
    const ticker = setInterval(() => setTick((t) => t + 1), 140);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    if (!drives && !error) return undefined;
    const timer = setTimeout(() => {
      setPhase('results');
      if (drives?.length) confetti({ particles: 90, duration: 2200 });
    }, SCAN_MS);
    return () => clearTimeout(timer);
  }, [drives, error]);

  if (phase === 'scanning') {
    return (
      <div className="match-scan" role="status" aria-live="polite">
        <div className="match-scan__radar" aria-hidden="true">
          <span />
          <span />
          <span />
          <strong>{names[tick % names.length]}</strong>
        </div>
        <h1 className="match-scan__title">
          Matching you with <mark>live drives</mark>…
        </h1>
        <p className="muted">Comparing your skills, interests and goals with every open drive.</p>
        <div className="match-scan__bar" aria-hidden="true">
          <span style={{ animationDuration: `${SCAN_MS}ms` }} />
        </div>
      </div>
    );
  }

  // Drives they can actually apply to come first; the API already ranks by score.
  const ranked = [...(drives || [])].sort((a, b) => Number(b.isEligible) - Number(a.isEligible));
  const top = ranked.slice(0, 5);
  const strong = (drives || []).filter((d) => d.isEligible && d.matchScore >= 60).length;

  return (
    <div className="match-results">
      <header className="match-results__head">
        <span className="sticker sticker--lime">
          <Sparkles size={14} aria-hidden="true" /> You're all set
        </span>
        <h1 className="match-results__title">
          {top.length ? (
            <>
              {firstName(user.name)}, here are your <mark>top matches.</mark>
            </>
          ) : (
            <>No open drives right now, {firstName(user.name)}.</>
          )}
        </h1>
        <p className="muted">
          {top.length
            ? `${pluralize(strong, 'strong match', 'strong matches')} you're eligible for, out of ${pluralize(drives.length, 'open drive')}. Scores update whenever you edit your preferences.`
            : "We'll rank new drives for you the moment the placement cell posts them."}
        </p>
      </header>

      {top.length > 0 && (
        <ol className="match-list">
          {top.map((drive, i) => (
            <li key={drive._id} className="match-item" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="match-item__rank">{String(i + 1).padStart(2, '0')}</span>
              <CompanyAvatar name={drive.companyName} size="lg" />
              <div className="match-item__body">
                <p className="match-item__title">
                  <strong>{drive.companyName}</strong> · {drive.role}
                </p>
                <p className="match-item__meta">
                  {formatPackage(drive.package)}
                  {drive.location ? ` · ${drive.location}` : ''}
                  {!drive.isEligible && <Badge tone="neutral">Not eligible yet</Badge>}
                </p>
                {drive.matchReasons?.length > 0 && (
                  <ul className="match-item__reasons">
                    {drive.matchReasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
              <MatchRing score={drive.matchScore} />
              <Link to={`/student/drives/${drive._id}`} className="match-item__link" aria-label={`View ${drive.companyName}`}>
                <ArrowRight size={18} />
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="match-results__actions">
        <Button as={Link} to="/student/drives" size="lg" icon={Search}>
          Explore all drives
        </Button>
        <Button as={Link} to="/student" variant="secondary" size="lg" icon={LayoutDashboard}>
          Go to my dashboard
        </Button>
      </div>
    </div>
  );
}
