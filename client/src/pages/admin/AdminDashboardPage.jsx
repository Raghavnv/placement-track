import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Clock, FileText, Filter, IndianRupee, Percent, PlusCircle, Trophy, Users } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { CompanyAvatar } from '../../components/common/Avatar';
import { DeadlineChip } from '../../components/common/Badges';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/States';
import StatCard from '../../components/admin/StatCard';
import FunnelChart from '../../components/admin/FunnelChart';
import BarList from '../../components/admin/BarList';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { getStats } from '../../services/adminService';
import { GRADUATION_YEARS } from '../../utils/constants';
import { formatNumber, formatPackage } from '../../utils/format';
import { STAGES, STAGE_LABELS } from '../../utils/stages';

function Panel({ title, subtitle, icon: Icon, children, action, className = '' }) {
  return (
    <section className={`card panel ${className}`}>
      <header className="card__header">
        {Icon && (
          <span className="card__icon" aria-hidden="true">
            <Icon size={18} />
          </span>
        )}
        <div>
          <h2 className="card__title">{title}</h2>
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
        {action && <div className="card__action">{action}</div>}
      </header>
      {children}
    </section>
  );
}

export default function AdminDashboardPage() {
  useDocumentTitle('Dashboard');
  const [year, setYear] = useState('');
  const { data: stats, error, loading, reload } = useAsync(() => getStats({ graduationYear: year }), [year]);

  const yearSelect = (
    <select className="input select select--sm" aria-label="Filter by graduation year" value={year} onChange={(e) => setYear(e.target.value)}>
      <option value="">All batches</option>
      {GRADUATION_YEARS.map((y) => (
        <option key={y} value={y}>
          Batch of {y}
        </option>
      ))}
    </select>
  );

  return (
    <div className="page page--wide">
      <PageHeader
        eyebrow="Placement season"
        title="Dashboard"
        description="Where the season stands, and where students need help."
        actions={
          <>
            {yearSelect}
            <Button as={Link} to="/admin/drives/new" icon={PlusCircle}>
              New drive
            </Button>
          </>
        }
      />

      {error && <ErrorState error={error} onRetry={reload} />}

      {loading && !stats ? (
        <div className="stat-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={112} radius={16} />
          ))}
        </div>
      ) : (
        stats && (
          <div className={loading ? 'is-refreshing' : ''}>
            <div className="stat-grid">
              <StatCard icon={Users} label="Students" value={formatNumber(stats.totals.students)} hint={year ? `Batch of ${year}` : 'Registered'} />
              <StatCard icon={Briefcase} label="Open drives" value={stats.totals.openDrives} hint={`${stats.totals.drives} total`} tone="info" />
              <StatCard icon={FileText} label="Applications" value={formatNumber(stats.totals.applications)} hint={`${stats.totals.offers} offers made`} tone="interview" />
              <StatCard
                icon={Trophy}
                label="Students placed"
                value={formatNumber(stats.totals.studentsPlaced)}
                hint={`of ${formatNumber(stats.totals.students)}`}
                tone="success"
              />
              <StatCard icon={Percent} label="Placement rate" value={`${stats.placementRate}%`} progress={stats.placementRate} tone="success" />
              <StatCard
                icon={IndianRupee}
                label="Highest package"
                value={formatPackage(stats.packageStats.highest)}
                hint={`Avg ${formatPackage(stats.packageStats.average)} · Median ${formatPackage(stats.packageStats.median)}`}
                tone="warning"
              />
            </div>

            <div className="panel-grid">
              <Panel title="Placement funnel" subtitle="Share of applications reaching each round" icon={Filter}>
                <FunnelChart funnel={stats.funnel} />
              </Panel>

              <Panel title="Applications by current stage" icon={FileText}>
                <BarList
                  items={STAGES.map((stage) => ({
                    key: stage,
                    label: STAGE_LABELS[stage],
                    value: stats.applicationsByStage[stage],
                    className: `bar--${stage}`,
                  }))}
                />
              </Panel>

              <Panel title="Placed by branch" subtitle="Students with an offer / registered" icon={Trophy}>
                {stats.placedByBranch.length ? (
                  <BarList
                    items={stats.placedByBranch.map((b) => ({
                      key: b.branch,
                      label: b.branch,
                      value: b.placed,
                      total: b.total,
                      display: `${b.placed} / ${b.total}`,
                      className: 'bar--offer',
                    }))}
                  />
                ) : (
                  <p className="muted">No students registered yet.</p>
                )}
              </Panel>

              <Panel
                title="Upcoming deadlines"
                icon={Clock}
                action={
                  <Link to="/admin/drives" className="text-link">
                    All drives <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                }
              >
                {stats.upcomingDeadlines.length ? (
                  <ul className="rank-list">
                    {stats.upcomingDeadlines.map((d) => (
                      <li key={d.driveId}>
                        <CompanyAvatar name={d.companyName} size="sm" />
                        <Link to={`/admin/drives/${d.driveId}/applicants`} className="rank-list__text">
                          <strong>{d.companyName}</strong>
                          <span>
                            {d.role} · {d.applicants} applied
                          </span>
                        </Link>
                        <DeadlineChip deadline={d.deadline} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState compact icon={Clock} title="No open deadlines" description="Post a drive to get applications coming in." />
                )}
              </Panel>

              <Panel title="Most applied drives" icon={Users} className="panel--wide">
                {stats.topDrives.length ? (
                  <ol className="rank-list rank-list--numbered">
                    {stats.topDrives.map((d) => (
                      <li key={d.driveId}>
                        <CompanyAvatar name={d.companyName} size="sm" />
                        <Link to={`/admin/drives/${d.driveId}/applicants`} className="rank-list__text">
                          <strong>{d.companyName}</strong>
                          <span>{d.role}</span>
                        </Link>
                        <span className="rank-list__stat">
                          <strong>{d.applicants}</strong> applied · <strong>{d.offers}</strong> offers
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">No applications yet.</p>
                )}
              </Panel>
            </div>
          </div>
        )
      )}
    </div>
  );
}
