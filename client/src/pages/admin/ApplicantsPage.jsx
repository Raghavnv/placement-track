import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, Clock, Download, FileText, Pencil, Search, SearchX, Users } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { CompanyAvatar, UserAvatar } from '../../components/common/Avatar';
import { Badge, StageBadge } from '../../components/common/Badges';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/States';
import StageControl from '../../components/admin/StageControl';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useSlashFocus from '../../hooks/useSlashFocus';
import { getApplicants } from '../../services/driveService';
import { getStudentResume } from '../../services/adminService';
import { formatDate, formatDateTime, formatPackage } from '../../utils/format';
import { STAGES, STAGE_LABELS, appliedAt } from '../../utils/stages';
import { downloadCsv, slugify } from '../../utils/csv';
import { openFileInNewTab } from '../../utils/openFile';

const PAGE_SIZE = 10;

function lastRemark(application) {
  const history = application.stageHistory || [];
  return [...history].reverse().find((h) => h.remark)?.remark;
}

export default function ApplicantsPage() {
  const { id } = useParams();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const searchRef = useRef(null);
  useSlashFocus(searchRef);
  const stage = params.get('stage') || '';
  const page = Number(params.get('page')) || 1;
  const [searchText, setSearchText] = useState(params.get('q') || '');
  const search = useDebounce(searchText.trim(), 300);
  const [exporting, setExporting] = useState(false);
  const [openingResume, setOpeningResume] = useState(null);

  const viewResume = async (student) => {
    setOpeningResume(student._id);
    try {
      await openFileInNewTab(() => getStudentResume(student._id));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOpeningResume(null);
    }
  };

  const setParam = (key, value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    if (search !== (params.get('q') || '')) setParam('q', search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data, error, loading, reload } = useAsync(
    () => getApplicants(id, { stage, search: params.get('q') || '', page, limit: PAGE_SIZE }),
    [id, stage, params.get('q'), page],
  );
  const drive = data?.drive;
  useDocumentTitle(drive ? `Applicants · ${drive.companyName}` : 'Applicants');

  const total = data ? Object.values(data.stageCounts).reduce((sum, n) => sum + n, 0) : 0;
  const back = { to: '/admin/drives', label: 'All drives' };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = [];
      let current = 1;
      let pages = 1;
      do {
        // eslint-disable-next-line no-await-in-loop
        const result = await getApplicants(id, { stage, search: params.get('q') || '', page: current, limit: 50 });
        rows.push(...result.data);
        pages = result.pagination.totalPages;
        current += 1;
      } while (current <= pages);

      downloadCsv(
        `${slugify(`${drive.companyName}-${drive.role}`)}-applicants.csv`,
        ['Name', 'Email', 'Roll number', 'Branch', 'CGPA', 'Backlogs', 'Graduation year', 'Phone', 'Stage', 'Applied on'],
        rows.map((a) => [
          a.student.name,
          a.student.email,
          a.student.rollNumber,
          a.student.branch,
          a.student.cgpa,
          a.student.backlogs,
          a.student.graduationYear,
          a.student.phone,
          STAGE_LABELS[a.stage],
          formatDate(appliedAt(a)),
        ]),
      );
      toast.success(`Exported ${rows.length} applicants`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (error?.status === 404 || error?.code === 'INVALID_ID') {
    return (
      <div className="page">
        <PageHeader title="Drive not found" back={back} />
        <div className="card">
          <EmptyState icon={SearchX} title="This drive doesn't exist" description="It may have been deleted." />
        </div>
      </div>
    );
  }

  return (
    <div className="page page--wide">
      <PageHeader
        back={back}
        title={drive ? drive.companyName : 'Applicants'}
        description={drive ? `${drive.role} · ${formatPackage(drive.package)}` : undefined}
        actions={
          drive && (
            <>
              <Button variant="secondary" icon={Download} onClick={exportCsv} loading={exporting} disabled={!total}>
                Export CSV
              </Button>
              <Button as={Link} to={`/admin/drives/${id}/edit`} variant="secondary" icon={Pencil}>
                Edit drive
              </Button>
            </>
          )
        }
      />

      {drive && (
        <div className="drive-strip card">
          <CompanyAvatar name={drive.companyName} size="lg" />
          <ul className="meta-list">
            <li>
              <Clock size={15} aria-hidden="true" /> Deadline {formatDateTime(drive.deadline)}
            </li>
            {drive.driveDate && (
              <li>
                <CalendarDays size={15} aria-hidden="true" /> Drive day {formatDateTime(drive.driveDate)}
              </li>
            )}
            <li>
              <Users size={15} aria-hidden="true" /> {total} applicants
            </li>
          </ul>
          <Badge tone={drive.status === 'open' ? 'success' : 'neutral'}>{drive.status === 'open' ? 'Open' : 'Closed'}</Badge>
        </div>
      )}

      {data && (
        <div className="stage-tabs" role="tablist" aria-label="Filter by stage">
          <button type="button" role="tab" aria-selected={!stage} className={`stage-tab ${!stage ? 'is-active' : ''}`} onClick={() => setParam('stage', '')}>
            All <span className="stage-tab__count">{total}</span>
          </button>
          {STAGES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={stage === s}
              className={`stage-tab stage-tab--${s} ${stage === s ? 'is-active' : ''}`}
              onClick={() => setParam('stage', s)}
            >
              <span className="stage-tab__dot" aria-hidden="true" />
              {STAGE_LABELS[s]} <span className="stage-tab__count">{data.stageCounts[s]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="toolbar card toolbar--inline">
        <div className="search-input">
          <Search size={18} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            className="input"
            placeholder="Search name or roll number"
            aria-label="Search applicants"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <kbd className="search-input__kbd" aria-hidden="true">/</kbd>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="card table-card">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height={56} radius={10} />
          ))}
        </div>
      ) : data?.data.length ? (
        <div className={`card table-card ${loading ? 'is-refreshing' : ''}`}>
          <table className="table table--responsive">
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Roll no.</th>
                <th scope="col">Branch</th>
                <th scope="col">CGPA</th>
                <th scope="col">Applied</th>
                <th scope="col">Resume</th>
                <th scope="col">Stage</th>
                <th scope="col">Move to</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((application) => {
                const remark = lastRemark(application);
                return (
                  <tr key={application._id}>
                    <td data-label="Student">
                      <div className="table__entity">
                        <UserAvatar name={application.student.name} />
                        <div>
                          <strong>{application.student.name}</strong>
                          <span>{application.student.email}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Roll no." className="table__mono">{application.student.rollNumber}</td>
                    <td data-label="Branch">{application.student.branch}</td>
                    <td data-label="CGPA" className="table__num">{application.student.cgpa}</td>
                    <td data-label="Applied">{formatDate(appliedAt(application))}</td>
                    <td data-label="Resume">
                      {application.student.resume ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={FileText}
                          onClick={() => viewResume(application.student)}
                          loading={openingResume === application.student._id}
                          title={application.student.resume.fileName}
                        >
                          View
                        </Button>
                      ) : (
                        <span className="muted">Not uploaded</span>
                      )}
                    </td>
                    <td data-label="Stage">
                      <div className="table__stack">
                        <StageBadge stage={application.stage} size="sm" />
                        {remark && (
                          <span className="table__remark" title={remark}>
                            {remark}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Move to">
                      <StageControl application={application} onMoved={reload} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        data && (
          <div className="card">
            <EmptyState
              icon={Users}
              title={stage || params.get('q') ? 'No applicants match' : 'No applicants yet'}
              description={
                stage || params.get('q')
                  ? 'Try another stage or search.'
                  : 'Eligible students will appear here as soon as they apply.'
              }
            />
          </div>
        )
      )}

      {data && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          itemLabel="applicants"
          onChange={(p) => setParam('page', String(p))}
        />
      )}
    </div>
  );
}
