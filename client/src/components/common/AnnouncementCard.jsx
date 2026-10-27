import { ExternalLink, Megaphone, Users } from 'lucide-react';
import { CompanyAvatar } from './Avatar';
import { formatDateTime, pluralize, timeAgo } from '../../utils/format';
import { STAGE_LABELS } from '../../utils/stages';

// One notice from the placement cell. Officers also see who it went to (showAudience) and get actions.
export default function AnnouncementCard({ announcement, showAudience = false, isNew = false, actions }) {
  const { title, message, link, drive, stages = [], createdAt, audienceCount } = announcement;

  return (
    <article className={`notice ${isNew ? 'is-new' : ''}`}>
      <span className="notice__icon" aria-hidden="true">
        {drive ? <CompanyAvatar name={drive.companyName} size="sm" /> : <Megaphone size={18} />}
      </span>
      <div className="notice__body">
        <header className="notice__head">
          <h3 className="notice__title">{title}</h3>
          {isNew && <span className="notice__new">New</span>}
        </header>
        <p className="notice__meta">
          <span>{drive ? `${drive.companyName} · ${drive.role}` : 'All students'}</span>
          {stages.length > 0 && <span>{stages.map((s) => STAGE_LABELS[s]).join(', ')}</span>}
          <time dateTime={createdAt} title={formatDateTime(createdAt)}>
            {timeAgo(createdAt)}
          </time>
          {showAudience && audienceCount !== undefined && (
            <span>
              <Users size={12} aria-hidden="true" /> {pluralize(audienceCount, 'student')}
            </span>
          )}
        </p>
        <p className="notice__message">{message}</p>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="notice__link">
            <ExternalLink size={14} aria-hidden="true" /> {link.replace(/^https?:\/\//i, '').slice(0, 60)}
          </a>
        )}
      </div>
      {actions && <div className="notice__actions">{actions}</div>}
    </article>
  );
}
