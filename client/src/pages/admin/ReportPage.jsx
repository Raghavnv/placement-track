import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileBarChart } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/States';
import { TierBadge } from '../../components/common/Badges';
import FunnelChart from '../../components/admin/FunnelChart';
import BarList from '../../components/admin/BarList';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { getReport } from '../../services/adminService';
import { BRANCH_NAMES, GRADUATION_YEARS } from '../../utils/constants';
import { formatDateTime, formatNumber, formatPackage } from '../../utils/format';

function Section({ title, subtitle, children, className = '' }) {
  return (
    <section className={`card report-section ${className}`}>
      <header className="report-section__head">
        <h2 className="card__title">{title}</h2>
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Figure({ label, value, hint }) {
  return (
    <div className="report-figure">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint && <p>{hint}</p>}
    </div>
  );
}

// Season placement report. "Download PDF" uses the browser's print dialog with a print stylesheet,
// so the PDF is real text (searchable, crisp) and needs no extra library.
export default function ReportPage() {
  useDocumentTitle('Placement report');
  const [year, setYear] = useState('');
  const { data: report, error, loading, reload } = useAsync(() => getReport({ graduationYear: year }), [year]);

  const batch = report?.graduationYear ? `Batch of ${report.graduationYear}` : 'All batches';

  return (
    <div className="page page--wide report">
      <PageHeader
        eyebrow="Placement season"
        title="Placement report"
        description="Season outcomes for the placement committee, NIRF and NAAC returns. Packages use each placed student's best full-time offer."
        actions={
          <>
            <select className="input select select--sm no-print" aria-label="Batch" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All batches</option>
              {GRADUATION_YEARS.map((y) => (
                <option key={y} value={y}>
                  Batch of {y}
                </option>
              ))}
            </select>
            <Button icon={Download} onClick={() => window.print()} disabled={!report} className="no-print">
              Download PDF
            </Button>
          </>
        }
      />

      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && !report && <CardSkeleton lines={6} />}

      {report && report.summary.students === 0 && (
        <div className="card">
          <EmptyState icon={FileBarChart} title="No students in this batch" description="Pick another batch, or wait until students register." />
        </div>
      )}

      {report && report.summary.students > 0 && (
        <div className={`report__body ${loading ? 'is-refreshing' : ''}`}>
          <p className="report__meta">
            {batch} · Generated {formatDateTime(report.generatedAt)} · Tiers: Dream from {formatPackage(report.policy.dreamMinPackage)}, Super Dream from{' '}
            {formatPackage(report.policy.superDreamMinPackage)}
          </p>

          <Section title="Summary">
            <dl className="report-figures">
              <Figure label="Students" value={formatNumber(report.summary.students)} hint={`${formatNumber(report.summary.applications)} applications`} />
              <Figure label="Placed" value={formatNumber(report.summary.placed)} hint={`${report.summary.multipleOffers} with more than one offer`} />
              <Figure label="Placement rate" value={`${report.summary.placementRate}%`} />
              <Figure label="Full-time offers" value={formatNumber(report.summary.fullTimeOffers)} hint={`${report.summary.internshipOffers} internship offers`} />
              <Figure label="Recruiters" value={formatNumber(report.summary.companies)} hint={`${report.summary.drives} drives held`} />
            </dl>
            <dl className="report-figures report-figures--packages">
              <Figure label="Highest package" value={formatPackage(report.packages.highest)} />
              <Figure label="Median package" value={formatPackage(report.packages.median)} />
              <Figure label="Average package" value={formatPackage(report.packages.average)} />
              <Figure label="Lowest package" value={formatPackage(report.packages.lowest)} />
            </dl>
          </Section>

          <div className="report__grid">
            <Section title="Branch-wise placement" subtitle="Placed / registered, and median package of placed students">
              <table className="table report-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th className="num">Students</th>
                    <th className="num">Placed</th>
                    <th className="num">Rate</th>
                    <th className="num">Median</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byBranch.map((b) => (
                    <tr key={b.branch}>
                      <td title={BRANCH_NAMES[b.branch]}>{b.branch}</td>
                      <td className="num">{b.students}</td>
                      <td className="num">{b.placed}</td>
                      <td className="num">{b.rate}%</td>
                      <td className="num">{b.placed ? formatPackage(b.median) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="Placed students by tier" subtitle="By the tier of each student's best offer">
              <ul className="report-tiers">
                {report.byTier.map((t) => (
                  <li key={t.tier}>
                    <TierBadge tier={t.tier} />
                    <span>{t.students} {t.students === 1 ? 'student' : 'students'}</span>
                  </li>
                ))}
              </ul>
              <BarList items={report.byTier.map((t) => ({ key: t.tier, label: t.label, value: t.students, total: report.summary.placed, className: 'bar--offer' }))} />
            </Section>

            <Section title="Selection funnel" subtitle="Applications that reached each round">
              <FunnelChart funnel={report.funnel} />
            </Section>

            <Section title="Recruiters" subtitle="Companies that made offers to this batch">
              {report.byCompany.length ? (
                <table className="table report-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Roles</th>
                      <th className="num">Offers</th>
                      <th className="num">Highest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byCompany.map((c) => (
                      <tr key={c.companyName}>
                        <td><strong>{c.companyName}</strong></td>
                        <td className="report-table__muted">{c.roles.join(', ')}</td>
                        <td className="num">{c.offers}</td>
                        <td className="num">{formatPackage(c.highest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No offers yet.</p>
              )}
            </Section>
          </div>

          <Section title={`Students not yet placed (${report.unplaced.length})`} subtitle="Who needs attention: applications made and still active" className="report-section--break">
            {report.unplaced.length ? (
              <table className="table report-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll no.</th>
                    <th>Branch</th>
                    <th className="num">CGPA</th>
                    <th className="num">Applications</th>
                    <th className="num">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {report.unplaced.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <Link to={`/admin/students?student=${s._id}`} className="report-table__link">{s.name}</Link>
                      </td>
                      <td className="table__mono">{s.rollNumber}</td>
                      <td>{s.branch}</td>
                      <td className="num">
                        {s.cgpa}
                        {s.backlogs ? <span className="report-table__muted"> · {s.backlogs} backlog{s.backlogs > 1 ? 's' : ''}</span> : null}
                      </td>
                      <td className="num">{s.applications || <span className="report-table__flag">None</span>}</td>
                      <td className="num">{s.active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">Every student in this batch is placed.</p>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
