import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { CompanyAvatar } from '../common/Avatar';
import { Badge } from '../common/Badges';
import Button from '../common/Button';
import { formatDate } from '../../utils/format';

const RESULT = {
  selected: { tone: 'success', label: 'Selected' },
  'not-selected': { tone: 'neutral', label: 'Not selected' },
  awaiting: { tone: 'warning', label: 'Awaiting result' },
};
const DIFFICULTY = ['', 'Easy', 'Manageable', 'Moderate', 'Hard', 'Very hard'];

// One senior's write-up of a company's selection process. Collapsed shows the first round; expand for all.
export default function ExperienceCard({ experience, onDelete, compact = false }) {
  const [open, setOpen] = useState(false);
  const { author, rounds } = experience;
  const result = RESULT[experience.result];
  const shown = open ? rounds : rounds.slice(0, 1);

  return (
    <article className="card experience">
      <header className="experience__head">
        <CompanyAvatar name={experience.companyName} />
        <div className="experience__title">
          <h3>{experience.companyName}</h3>
          <p>
            {experience.role} · {experience.year}
          </p>
        </div>
        <div className="experience__badges">
          <Badge tone={result.tone}>{result.label}</Badge>
          <span className="experience__difficulty" title="Difficulty, rated by the author">
            {DIFFICULTY[experience.difficulty]} · {experience.difficulty}/5
          </span>
        </div>
      </header>

      <ol className="experience__rounds">
        {shown.map((round, i) => (
          <li key={i}>
            <strong>
              Round {i + 1}: {round.name}
            </strong>
            <p>{round.details}</p>
          </li>
        ))}
      </ol>
      {open && experience.tips && (
        <div className="experience__tips">
          <strong>Tips</strong>
          <p>{experience.tips}</p>
        </div>
      )}

      <footer className="experience__foot">
        <span>
          {author?.name}
          {author?.branch ? ` · ${author.branch}` : ''}
          {author?.graduationYear ? ` ${author.graduationYear}` : ''} · {formatDate(experience.createdAt)}
          {experience.anonymous && experience.mine && ' · Shown to students as anonymous'}
        </span>
        <span className="experience__actions">
          {onDelete && (experience.mine || onDelete.any) && (
            <Button variant="ghost-danger" size="sm" icon={Trash2} onClick={() => onDelete(experience)}>
              Delete
            </Button>
          )}
          {(rounds.length > 1 || experience.tips) && !compact && (
            <Button variant="ghost" size="sm" iconRight={open ? ChevronUp : ChevronDown} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? 'Show less' : `All ${rounds.length} rounds${experience.tips ? ' and tips' : ''}`}
            </Button>
          )}
        </span>
      </footer>
    </article>
  );
}
