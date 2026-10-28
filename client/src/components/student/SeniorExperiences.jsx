import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import ExperienceCard from './ExperienceCard';
import useAsync from '../../hooks/useAsync';
import { listExperiences } from '../../services/experienceService';

// "From seniors" on a drive page: the latest write-ups for this company, or a nudge to write one.
export default function SeniorExperiences({ companyName }) {
  const { data } = useAsync(() => listExperiences({ company: companyName, limit: 2 }).catch(() => null), [companyName]);
  if (!data) return null;
  const all = `/student/experiences?company=${encodeURIComponent(companyName)}`;

  return (
    <section className="card seniors" aria-labelledby="seniors-title">
      <header className="card__header card__header--split">
        <div>
          <h2 id="seniors-title" className="card__title">
            <BookOpen size={16} aria-hidden="true" /> From seniors
          </h2>
          <p className="card__subtitle">How {companyName}'s selection went for students before you</p>
        </div>
        {data.pagination.total > 0 && (
          <Link to={all} className="text-link">
            All {data.pagination.total} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </header>
      {data.data.length ? (
        <div className="experience-list">
          {data.data.map((exp) => (
            <ExperienceCard key={exp._id} experience={exp} />
          ))}
        </div>
      ) : (
        <p className="seniors__empty">
          No one has written about {companyName} yet. If you've been through its process,{' '}
          <Link to={`/student/experiences?company=${encodeURIComponent(companyName)}&write=1`}>share how it went</Link>.
        </p>
      )}
    </section>
  );
}
