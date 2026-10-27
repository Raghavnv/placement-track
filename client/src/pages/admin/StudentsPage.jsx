import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, FileText, GraduationCap, Search } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { UserAvatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badges';
import { Segmented } from '../../components/common/Field';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/States';
import StudentDrawer from '../../components/admin/StudentDrawer';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useSlashFocus from '../../hooks/useSlashFocus';
import { getStudentResume, listStudents } from '../../services/adminService';
import { BRANCHES, GRADUATION_YEARS } from '../../utils/constants';
import { downloadCsv } from '../../utils/csv';
import { formatPackage } from '../../utils/format';
import { openFileInNewTab } from '../../utils/openFile';

const PAGE_SIZE = 15;
const FILTERS = ['status', 'branch', 'year', 'minCgpa', 'resume', 'sort'];

export default function StudentsPage() {
  useDocumentTitle('Students');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const searchRef = useRef(null);
  useSlashFocus(searchRef);
  const [searchText, setSearchText] = useState(params.get('q') || '');
  const search = useDebounce(searchText.trim(), 300);
  const [exporting, setExporting] = useState(false);
  const [openingResume, setOpeningResume] = useState(null);

  const value = (key) => params.get(key) || '';
  const page = Number(params.get('page')) || 1;
  const openStudent = value('student');

  const setParam = (key, next) =>
    setParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (next) updated.set(key, next);
        else updated.delete(key);
        if (key !== 'page' && key !== 'student') updated.delete('page');
        return updated;
      },
      { replace: key !== 'student' },
    );

  useEffect(() => {
    if (search !== value('q')) setParam('q', search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const query = {
    search: value('q'),
    status: value('status'),
    branch: value('branch'),
    graduationYear: value('year'),
    minCgpa: value('minCgpa'),
    resume: value('resume'),
    sort: value('sort'),
  };
  const { data, error, loading, reload } = useAsync(
    () => listStudents({ ...query, page, limit: PAGE_SIZE }),
    [value('q'), ...FILTERS.map(value), page],
  );
  const counts = data?.counts;
  const filtered = Boolean(value('q') || FILTERS.some((key) => key !== 'sort' && value(key)));

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

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = [];
      let current = 1;
      let pages = 1;
      do {
        // eslint-disable-next-line no-await-in-loop
        const result = await listStudents({ ...query, page: current, limit: 50 });
        rows.push(...result.data);
        pages = result.pagination.totalPages;
        current += 1;
      } while (current <= pages);

      downloadCsv(
        'students.csv',
        ['Name', 'Email', 'Roll number', 'Branch', 'Graduation year', 'CGPA', 'Backlogs', 'Phone', 'Applications', 'Active', 'Offers', 'Best offer (LPA)', 'Resume'],
        rows.map((s) => [
          s.name,
          s.email,
          s.rollNumber,
          s.branch,
          s.graduationYear,
          s.cgpa,
          s.backlogs,
          s.phone,
          s.applicationCount,
          s.activeCount,
          s.offerCount,
          s.bestOffer ?? '',
          s.resume ? 'Yes' : 'No',
        ]),
      );
      toast.success(`Exported ${rows.length} students`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  const select = (key, label, options) => (
    <select className="input select select--sm" aria-label={label} value={value(key)} onChange={(e) => setParam(key, e.target.value)}>
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );

  return (
    <div className="page page--wide">
      <PageHeader
        eyebrow="Placement season"
        title="Students"
        description="Everyone registered. Find who still needs an offer, or a resume."
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv} loading={exporting} disabled={!data?.pagination.total}>
            Export CSV
          </Button>
        }
      />

      <div className="toolbar toolbar--stack card">
        <div className="toolbar__row">
          <div className="search-input">
            <Search size={18} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              className="input"
              placeholder="Search name, roll number or email"
              aria-label="Search students"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <kbd className="search-input__kbd" aria-hidden="true">/</kbd>
          </div>
          <Segmented
            label="Placement status"
            name="status"
            size="sm"
            value={value('status')}
            onChange={(v) => setParam('status', v)}
            options={[
              { value: '', label: `All${counts ? ` ${counts.all}` : ''}` },
              { value: 'unplaced', label: `Not placed${counts ? ` ${counts.unplaced}` : ''}` },
              { value: 'placed', label: `Placed${counts ? ` ${counts.placed}` : ''}` },
            ]}
          />
        </div>
        <div className="toolbar__row">
          {select('branch', 'Branch', [['', 'All branches'], ...BRANCHES.map((b) => [b, b])])}
          {select('year', 'Batch', [['', 'All batches'], ...GRADUATION_YEARS.map((y) => [String(y), `Batch of ${y}`])])}
          {select('minCgpa', 'Minimum CGPA', [['', 'Any CGPA'], ['6', 'CGPA 6+'], ['7', 'CGPA 7+'], ['8', 'CGPA 8+'], ['9', 'CGPA 9+']])}
          <button
            type="button"
            className={`chip-toggle ${value('resume') === 'no' ? 'is-on' : ''}`}
            aria-pressed={value('resume') === 'no'}
            onClick={() => setParam('resume', value('resume') === 'no' ? '' : 'no')}
          >
            No resume{counts ? ` · ${counts.noResume}` : ''}
          </button>
          <span className="toolbar__spacer" />
          {select('sort', 'Sort by', [['', 'Roll number'], ['name', 'Name'], ['-cgpa', 'CGPA, high to low'], ['-createdAt', 'Newest first']])}
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="card table-card">
          {Array.from({ length: 6 }, (_, i) => (
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
                <th scope="col">Batch</th>
                <th scope="col">CGPA</th>
                <th scope="col">Applications</th>
                <th scope="col">Status</th>
                <th scope="col">Resume</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((student) => (
                <tr key={student._id}>
                  <td data-label="Student">
                    <button type="button" className="table__entity table__entity--button" onClick={() => setParam('student', student._id)}>
                      <UserAvatar name={student.name} />
                      <div>
                        <strong>{student.name}</strong>
                        <span>{student.email}</span>
                      </div>
                    </button>
                  </td>
                  <td data-label="Roll no." className="table__mono">{student.rollNumber}</td>
                  <td data-label="Branch">{student.branch}</td>
                  <td data-label="Batch">{student.graduationYear}</td>
                  <td data-label="CGPA" className="table__num">
                    {student.cgpa}
                    {student.backlogs > 0 && <span className="table__remark"> · {student.backlogs} backlog{student.backlogs > 1 ? 's' : ''}</span>}
                  </td>
                  <td data-label="Applications">
                    {student.applicationCount ? (
                      <span>
                        {student.applicationCount}
                        {student.activeCount > 0 && <span className="muted"> · {student.activeCount} active</span>}
                      </span>
                    ) : (
                      <span className="muted">None</span>
                    )}
                  </td>
                  <td data-label="Status">
                    {student.offerCount ? (
                      <Badge tone="success">Placed · {formatPackage(student.bestOffer)}</Badge>
                    ) : (
                      <Badge tone="neutral">Not placed</Badge>
                    )}
                  </td>
                  <td data-label="Resume">
                    {student.resume ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={FileText}
                        onClick={() => viewResume(student)}
                        loading={openingResume === student._id}
                        title={student.resume.fileName}
                      >
                        View
                      </Button>
                    ) : (
                      <span className="muted">Not uploaded</span>
                    )}
                  </td>
                  <td className="table__actions">
                    <Button size="sm" variant="soft" onClick={() => setParam('student', student._id)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        data && (
          <div className="card">
            <EmptyState
              icon={GraduationCap}
              title={filtered ? 'No students match' : 'No students yet'}
              description={filtered ? 'Try a different search or fewer filters.' : 'Students appear here as soon as they register.'}
            />
          </div>
        )
      )}

      {data && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          itemLabel="students"
          onChange={(p) => setParam('page', String(p))}
        />
      )}

      {openStudent && <StudentDrawer studentId={openStudent} onClose={() => setParam('student', '')} />}
    </div>
  );
}
