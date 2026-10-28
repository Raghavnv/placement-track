import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Download, FileArchive, FileText, ListChecks, Megaphone, Pencil, Search, SearchX, Users, X, XCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { CompanyAvatar, UserAvatar } from '../../components/common/Avatar';
import { Badge, StageBadge } from '../../components/common/Badges';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/States';
import StageControl from '../../components/admin/StageControl';
import BulkStageDialog from '../../components/admin/BulkStageDialog';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useSlashFocus from '../../hooks/useSlashFocus';
import { downloadResumesZip, getApplicants } from '../../services/driveService';
import { getStudentResume } from '../../services/adminService';
import { formatDate, formatDateTime, formatPackage, pluralize } from '../../utils/format';
import { STAGES, STAGE_LABELS, TRANSITIONS, appliedAt, isFinal } from '../../utils/stages';
import { downloadCsv, slugify } from '../../utils/csv';
import { openFileInNewTab, saveFile } from '../../utils/openFile';

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
  const [selected, setSelected] = useState(() => new Map()); // application id -> application, kept across pages
  const [bulk, setBulk] = useState(null); // { stage } for ticked rows, { paste: true } for roll numbers
  const [zipping, setZipping] = useState(''); // 'stage' or 'selection' while a resume ZIP downloads

  const downloadResumes = async (source) => {
    setZipping(source);
    try {
      const body = source === 'selection' ? { applicationIds: [...selected.keys()] } : stage ? { stage } : {};
      const { blob, filename, included, missing } = await downloadResumesZip(id, body);
      saveFile(blob, filename);
      toast.success(
        missing
          ? `Downloaded ${pluralize(included, 'resume')} · ${missing} without one (listed in no-resume.txt)`
          : `Downloaded ${pluralize(included, 'resume')}`,
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setZipping('');
    }
  };

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

  // A new stage filter or search shows different people, so start the selection again.
  useEffect(() => setSelected(new Map()), [stage, params.get('q')]);

  const selectable = data?.data.filter((a) => !isFinal(a.stage)) || [];
  const allOnPage = selectable.length > 0 && selectable.every((a) => selected.has(a._id));
  const someOnPage = selectable.some((a) => selected.has(a._id));
  const toggleRow = (application) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(application._id)) next.delete(application._id);
      else next.set(application._id, application);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      selectable.forEach((a) => (allOnPage ? next.delete(a._id) : next.set(a._id, a)));
      return next;
    });

  // Every stage at least one ticked applicant can move to, with how many can.
  const selection = [...selected.values()];
  const bulkTargets = STAGES.map((target) => ({ target, count: selection.filter((a) => TRANSITIONS[a.stage].includes(target)).length })).filter(
    (t) => t.count > 0,
  );

  const finishBulk = (result) => {
    const parts = [result.stage === 'rejected' ? `Rejected ${result.moved}` : `Moved ${result.moved} to ${STAGE_LABELS[result.stage]}`];
    if (result.skipped.length) parts.push(`${result.skipped.length} skipped`);
    if (result.notFound.length) parts.push(`${result.notFound.length} not found`);
    toast.success(parts.join(' · '));
    setSelected(new Map());
    reload();
  };

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
              <Button as={Link} to={`/admin/announcements?drive=${id}`} variant="secondary" icon={Megaphone}>
                Announce
              </Button>
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
        {drive && (
          <div className="toolbar__row">
            <Button
              variant="secondary"
              icon={FileArchive}
              onClick={() => downloadResumes('stage')}
              loading={zipping === 'stage'}
              disabled={!total || Boolean(stage && !data?.stageCounts[stage])}
              title={stage ? `ZIP of resumes of everyone at ${STAGE_LABELS[stage]}` : 'ZIP of every applicant\'s resume'}
            >
              {stage ? `${STAGE_LABELS[stage]} resumes` : 'All resumes'}
            </Button>
            <Button variant="secondary" icon={ListChecks} onClick={() => setBulk({ paste: true })} disabled={!total}>
              Move by roll numbers
            </Button>
          </div>
        )}
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
                <th scope="col" className="table__check">
                  <input
                    type="checkbox"
                    aria-label="Select everyone on this page"
                    checked={allOnPage}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPage && !allOnPage;
                    }}
                    onChange={togglePage}
                    disabled={!selectable.length}
                  />
                </th>
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
                  <tr key={application._id} className={selected.has(application._id) ? 'is-selected' : ''}>
                    <td data-label="Select" className="table__check">
                      <input
                        type="checkbox"
                        aria-label={`Select ${application.student.name}`}
                        checked={selected.has(application._id)}
                        onChange={() => toggleRow(application)}
                        disabled={isFinal(application.stage)}
                        title={isFinal(application.stage) ? `${STAGE_LABELS[application.stage]} is final` : undefined}
                      />
                    </td>
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

      {selected.size > 0 && (
        <div className="bulk-bar" role="region" aria-label="Bulk actions">
          <span className="bulk-bar__count">
            <strong>{selected.size}</strong> selected
          </span>
          {bulkTargets.map(({ target, count }) =>
            target === 'rejected' ? (
              <Button key={target} size="sm" variant="ghost-on-ink" icon={XCircle} onClick={() => setBulk({ stage: target })}>
                Reject {count}
              </Button>
            ) : (
              <Button key={target} size="sm" variant="lime" iconRight={ArrowRight} onClick={() => setBulk({ stage: target })}>
                Move {count} to {STAGE_LABELS[target]}
              </Button>
            ),
          )}
          <Button size="sm" variant="ghost-on-ink" icon={FileArchive} onClick={() => downloadResumes('selection')} loading={zipping === 'selection'}>
            Resumes
          </Button>
          <Button size="sm" variant="ghost-on-ink" icon={X} onClick={() => setSelected(new Map())}>
            Clear
          </Button>
        </div>
      )}

      {bulk && (
        <BulkStageDialog
          open
          driveId={id}
          selection={bulk.paste ? null : selection}
          stage={bulk.stage}
          onClose={() => setBulk(null)}
          onDone={finishBulk}
        />
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
