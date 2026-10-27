import { Link } from 'react-router-dom';
import { AlarmClock, ArrowRight, CalendarCheck2, PartyPopper } from 'lucide-react';
import { CompanyAvatar } from '../common/Avatar';
import { StageBadge } from '../common/Badges';
import { formatDateTime, formatWeekdayDate, timeLeft } from '../../utils/format';

export default function ReminderPanel({ reminders, days }) {
  const { deadlines, upcomingDrives } = reminders;
  const empty = !deadlines.length && !upcomingDrives.length;

  return (
    <section className="card reminder-panel" aria-labelledby="reminders-title">
      <header className="card__header">
        <span className="card__icon card__icon--warning" aria-hidden="true">
          <AlarmClock size={18} />
        </span>
        <div>
          <h2 id="reminders-title" className="card__title">Coming up</h2>
          <p className="card__subtitle">Next {days} days</p>
        </div>
      </header>

      {empty && (
        <div className="reminder-panel__clear">
          <PartyPopper size={22} aria-hidden="true" />
          <p>
            <strong>You're all caught up.</strong> No deadlines or drive days in the next {days} days.
          </p>
        </div>
      )}

      {deadlines.length > 0 && (
        <>
          <h3 className="reminder-panel__label">Apply before it closes</h3>
          <ul className="reminder-list">
            {deadlines.map((item) => {
              const { label, urgency } = timeLeft(item.deadline);
              return (
                <li key={item.driveId} className={`reminder reminder--${urgency}`}>
                  <CompanyAvatar name={item.companyName} size="sm" />
                  <div className="reminder__text">
                    <strong>{item.companyName}</strong>
                    <span>{item.role}</span>
                  </div>
                  <span className={`chip chip--${urgency}`} title={formatDateTime(item.deadline)}>
                    {label}
                  </span>
                  <Link to={`/student/drives/${item.driveId}`} className="reminder__action" aria-label={`View and apply to ${item.companyName}`}>
                    <ArrowRight size={18} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {upcomingDrives.length > 0 && (
        <>
          <h3 className="reminder-panel__label">
            <CalendarCheck2 size={14} aria-hidden="true" /> Drive days
          </h3>
          <ul className="reminder-list">
            {upcomingDrives.map((item) => (
              <li key={item.applicationId} className="reminder">
                <CompanyAvatar name={item.companyName} size="sm" />
                <div className="reminder__text">
                  <strong>{item.companyName}</strong>
                  <span>{formatWeekdayDate(item.driveDate)}</span>
                </div>
                <StageBadge stage={item.stage} size="sm" />
                <Link to={`/student/applications?app=${item.applicationId}`} className="reminder__action" aria-label={`Open ${item.companyName} application`}>
                  <ArrowRight size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
