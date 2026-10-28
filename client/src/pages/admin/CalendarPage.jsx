import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button, { IconButton } from '../../components/common/Button';
import { ErrorState } from '../../components/common/States';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { getCalendar } from '../../services/adminService';
import { formatWeekdayDate } from '../../utils/format';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

// The 6-week grid (Monday first) that shows this month.
function monthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

// Deadlines and drive days for the month. A day with two or more drive days is a clash:
// the same students may be shortlisted for both, and rooms and panels overlap.
export default function CalendarPage() {
  useDocumentTitle('Calendar');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const days = useMemo(() => monthGrid(month), [month]);
  const from = days[0];
  const to = new Date(days[41].getFullYear(), days[41].getMonth(), days[41].getDate() + 1);
  const { data, error, loading, reload } = useAsync(() => getCalendar(from, to), [month]);

  const events = useMemo(() => {
    const byDay = new Map();
    const add = (date, event) => {
      const key = dayKey(new Date(date));
      byDay.set(key, [...(byDay.get(key) || []), event]);
    };
    (data || []).forEach((drive) => {
      add(drive.deadline, { kind: 'deadline', drive, at: drive.deadline });
      if (drive.driveDate) add(drive.driveDate, { kind: 'drive', drive, at: drive.driveDate });
    });
    byDay.forEach((list) => list.sort((a, b) => (a.kind === b.kind ? new Date(a.at) - new Date(b.at) : a.kind === 'drive' ? -1 : 1)));
    return byDay;
  }, [data]);

  const clashes = days
    .map((d) => ({ date: d, drives: (events.get(dayKey(d)) || []).filter((e) => e.kind === 'drive') }))
    .filter((d) => d.drives.length > 1);

  const today = dayKey(new Date());
  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="page page--wide">
      <PageHeader
        eyebrow="Placement season"
        title="Calendar"
        description="Application deadlines and drive days. Days with more than one drive are flagged so you can spread them out."
        actions={
          <div className="calendar__nav">
            <IconButton icon={ChevronLeft} label="Previous month" onClick={() => shift(-1)} />
            <strong aria-live="polite">{monthLabel}</strong>
            <IconButton icon={ChevronRight} label="Next month" onClick={() => shift(1)} />
            <Button variant="secondary" size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
              Today
            </Button>
          </div>
        }
      />

      {error && <ErrorState error={error} onRetry={reload} />}

      {clashes.length > 0 && (
        <div className="calendar-clashes" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <div>
            <strong>{clashes.length === 1 ? '1 day has' : `${clashes.length} days have`} more than one drive.</strong>
            {clashes.map((c) => (
              <span key={dayKey(c.date)}>
                {formatWeekdayDate(c.date)}: {c.drives.map((e) => e.drive.companyName).join(', ')}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="calendar-legend" aria-hidden="true">
        <span><i className="calendar-dot calendar-dot--drive" /> Drive day</span>
        <span><i className="calendar-dot calendar-dot--deadline" /> Application deadline</span>
      </div>

      <div className={`card calendar ${loading ? 'is-refreshing' : ''}`} role="grid" aria-label={`Calendar for ${monthLabel}`}>
        <div className="calendar__weekdays" role="row">
          {WEEKDAYS.map((d) => (
            <span key={d} role="columnheader">{d}</span>
          ))}
        </div>
        <div className="calendar__grid">
          {days.map((day) => {
            const key = dayKey(day);
            const list = events.get(key) || [];
            const driveCount = list.filter((e) => e.kind === 'drive').length;
            const outside = day.getMonth() !== month.getMonth();
            return (
              <div
                key={key}
                role="gridcell"
                className={`calendar__day ${outside ? 'is-outside' : ''} ${key === today ? 'is-today' : ''} ${driveCount > 1 ? 'is-clash' : ''}`}
                aria-label={`${formatWeekdayDate(day)}${list.length ? `, ${list.length} ${list.length === 1 ? 'event' : 'events'}` : ''}${driveCount > 1 ? ', clash' : ''}`}
              >
                <span className="calendar__date">{day.getDate()}</span>
                <ul className="calendar__events">
                  {list.slice(0, 3).map((e) => (
                    <li key={`${e.kind}-${e.drive._id}`}>
                      <Link to={`/admin/drives/${e.drive._id}/applicants`} className={`calendar-event calendar-event--${e.kind}`} title={`${e.kind === 'drive' ? 'Drive day' : 'Deadline'}: ${e.drive.companyName}, ${e.drive.role}, ${time(e.at)}`}>
                        {e.drive.companyName}
                      </Link>
                    </li>
                  ))}
                  {list.length > 3 && <li className="calendar__more">+{list.length - 3} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <section className="card calendar-agenda" aria-labelledby="agenda-title">
        <h2 id="agenda-title" className="card__title">
          <CalendarDays size={16} aria-hidden="true" /> {monthLabel}, day by day
        </h2>
        {(() => {
          const rows = days.filter((d) => d.getMonth() === month.getMonth() && events.get(dayKey(d)));
          if (!rows.length) return <p className="muted">Nothing scheduled this month.</p>;
          return (
            <ul className="calendar-agenda__list">
              {rows.map((d) => (
                <li key={dayKey(d)}>
                  <span className="calendar-agenda__date">{formatWeekdayDate(d)}</span>
                  <ul>
                    {events.get(dayKey(d)).map((e) => (
                      <li key={`${e.kind}-${e.drive._id}`}>
                        <i className={`calendar-dot calendar-dot--${e.kind}`} aria-hidden="true" />
                        <Link to={`/admin/drives/${e.drive._id}/applicants`}>
                          <strong>{e.drive.companyName}</strong> · {e.drive.role}
                        </Link>
                        <span className="calendar-agenda__meta">
                          {e.kind === 'drive' ? 'Drive day' : 'Deadline'} · {time(e.at)} · {e.drive.applicantCount} applied
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          );
        })()}
      </section>
    </div>
  );
}
