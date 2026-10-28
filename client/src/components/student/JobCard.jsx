import { Briefcase, Clock, ExternalLink, MapPin } from 'lucide-react';
import { CompanyAvatar } from '../common/Avatar';
import MatchRing from '../common/MatchRing';
import FitCheckButton from './FitCheckButton';
import { formatPackage, timeAgo } from '../../utils/format';

const JOB_TYPE_LABELS = { 'full-time': 'Full-time', 'part-time': 'Part-time', contract: 'Contract', internship: 'Internship' };

function formatSalary({ salaryMin, salaryMax }) {
  if (salaryMin && salaryMax && salaryMin !== salaryMax) return `₹${salaryMin}–${salaryMax} LPA`;
  const single = salaryMin || salaryMax;
  return single ? formatPackage(single) : 'Salary not listed';
}

// An outside job as a ticket, like DriveCard. The title link covers the card and opens the listing
// on the company's site; "How do I fit?" sits above it, since a button can't live inside a link.
export default function JobCard({ job }) {
  const hasSalary = Boolean(job.salaryMin || job.salaryMax);
  const fitTarget = {
    job: { id: job.id, title: job.title, company: job.company, location: job.location, description: job.description, skills: job.skills },
  };
  return (
    <article className="ticket job-ticket">
      <div className="ticket__top">
        <CompanyAvatar name={job.company} size="lg" />
        <div className="ticket__title">
          <h3>
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="job-ticket__link">
              {job.title}
              <span className="sr-only"> (opens the listing in a new tab)</span>
            </a>
          </h3>
          <p>{job.company}</p>
        </div>
        <MatchRing score={job.matchScore} size={58} />
      </div>

      {job.matchReasons[0] && <p className="ticket__reason">✦ {job.matchReasons[0]}</p>}
      {job.skills.length > 0 && (
        <ul className="job-ticket__skills" aria-label="Skills mentioned">
          {job.skills.slice(0, 4).map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      )}

      <div className="ticket__tear" aria-hidden="true" />

      <div className="ticket__bottom">
        <p className={`ticket__package ${hasSalary ? '' : 'job-ticket__no-salary'}`}>
          {formatSalary(job)}
          {hasSalary && <span>{job.salaryIsEstimate ? 'estimated' : 'per year'}</span>}
        </p>
        <ul className="meta-list">
          {job.location && (
            <li>
              <MapPin size={14} aria-hidden="true" />
              {job.location}
            </li>
          )}
          <li>
            <Briefcase size={14} aria-hidden="true" />
            {JOB_TYPE_LABELS[job.jobType] || job.jobType}
          </li>
          {job.postedAt && (
            <li>
              <Clock size={14} aria-hidden="true" />
              {timeAgo(job.postedAt)}
            </li>
          )}
        </ul>
        <div className="job-ticket__actions">
          <span className="job-ticket__cta" aria-hidden="true">
            Apply on company site <ExternalLink size={14} />
          </span>
          <FitCheckButton target={fitTarget} title={`${job.title} at ${job.company}`} size="sm" />
        </div>
      </div>
    </article>
  );
}
