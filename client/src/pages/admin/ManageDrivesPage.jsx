import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Briefcase, Lock, Pencil, PlusCircle, Search, Trash2, Unlock, Users } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button, { IconButton } from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { CompanyAvatar } from '../../components/common/Avatar';
import { Badge, DeadlineChip } from '../../components/common/Badges';
import { Segmented } from '../../components/common/Field';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/States';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useSlashFocus from '../../hooks/useSlashFocus';
import { deleteDrive, listDrives, updateDrive } from '../../services/driveService';
import { formatDate, formatPackage, pluralize } from '../../utils/format';
import { jobTypeLabel } from '../../utils/constants';

export default function ManageDrivesPage() {
  useDocumentTitle('Drives');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const searchRef = useRef(null);
  useSlashFocus(searchRef);
  const status = params.get('status') || 'all';
  const page = Number(params.get('page')) || 1;
  const [searchText, setSearchText] = useState(params.get('q') || '');
  const search = useDebounce(searchText.trim(), 300);
  const [toDelete, setToDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const setParam = (key, value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === 'all') next.delete(key);
        else next.set(key, value);
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
    () => listDrives({ status, search: params.get('q') || '', page, limit: 10, sort: '-createdAt' }),
    [status, params.get('q'), page],
  );

  const toggleStatus = async (drive) => {
    setBusyId(drive._id);
    const nextStatus = drive.status === 'open' ? 'closed' : 'open';
    try {
      await updateDrive(drive._id, { status: nextStatus });
      toast.success(`${drive.companyName} is now ${nextStatus === 'open' ? 'open for applications' : 'closed'}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setBusyId(toDelete._id);
    try {
      const result = await deleteDrive(toDelete._id);
      toast.success(`Deleted ${toDelete.companyName} and ${pluralize(result.deletedApplications, 'application')}`);
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page page--wide">
      <PageHeader
        title="Drives"
        description="Every drive you've posted, newest first."
        actions={
          <Button as={Link} to="/admin/drives/new" icon={PlusCircle}>
            New drive
          </Button>
        }
      />

      <div className="toolbar card toolbar--inline">
        <div className="search-input">
          <Search size={18} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            className="input"
            placeholder="Search company or role"
            aria-label="Search drives"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <kbd className="search-input__kbd" aria-hidden="true">/</kbd>
        </div>
        <Segmented
          label="Status"
          name="status"
          size="sm"
          value={status}
          onChange={(v) => setParam('status', v)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
          ]}
        />
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
                <th scope="col">Drive</th>
                <th scope="col">Package</th>
                <th scope="col">Deadline</th>
                <th scope="col">Status</th>
                <th scope="col">Applicants</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((drive) => (
                <tr key={drive._id}>
                  <td data-label="Drive">
                    <div className="table__entity">
                      <CompanyAvatar name={drive.companyName} />
                      <div>
                        <strong>{drive.companyName}</strong>
                        <span>
                          {drive.role} · {jobTypeLabel(drive.jobType)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Package" className="table__num">{formatPackage(drive.package)}</td>
                  <td data-label="Deadline">
                    <div className="table__stack">
                      <span>{formatDate(drive.deadline)}</span>
                      <DeadlineChip deadline={drive.deadline} compact />
                    </div>
                  </td>
                  <td data-label="Status">
                    <Badge tone={drive.status === 'open' ? 'success' : 'neutral'}>{drive.status === 'open' ? 'Open' : 'Closed'}</Badge>
                  </td>
                  <td data-label="Applicants">
                    <Link to={`/admin/drives/${drive._id}/applicants`} className="text-link">
                      <Users size={15} aria-hidden="true" /> {drive.applicantCount}
                    </Link>
                  </td>
                  <td className="table__actions">
                    <Button as={Link} to={`/admin/drives/${drive._id}/applicants`} size="sm" variant="soft">
                      Applicants
                    </Button>
                    <Button as={Link} to={`/admin/drives/${drive._id}/edit`} size="sm" variant="ghost" icon={Pencil} aria-label={`Edit ${drive.companyName}`}>
                      <span className="hide-sm">Edit</span>
                    </Button>
                    <IconButton
                      icon={drive.status === 'open' ? Lock : Unlock}
                      label={drive.status === 'open' ? `Close ${drive.companyName}` : `Reopen ${drive.companyName}`}
                      onClick={() => toggleStatus(drive)}
                      disabled={busyId === drive._id}
                    />
                    <IconButton icon={Trash2} label={`Delete ${drive.companyName}`} className="icon-btn--danger" onClick={() => setToDelete(drive)} />
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
              icon={Briefcase}
              title={params.get('q') || status !== 'all' ? 'No drives match' : 'No drives yet'}
              description={params.get('q') || status !== 'all' ? 'Try a different search or status.' : 'Post your first drive and students will see it straight away.'}
              action={
                <Button as={Link} to="/admin/drives/new" icon={PlusCircle}>
                  New drive
                </Button>
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
          itemLabel="drives"
          onChange={(p) => setParam('page', String(p))}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={Boolean(toDelete) && busyId === toDelete?._id}
        tone="danger"
        confirmLabel="Delete drive"
        title={toDelete ? `Delete ${toDelete.companyName} – ${toDelete.role}?` : ''}
        description={
          toDelete
            ? `This also removes ${pluralize(toDelete.applicantCount, 'application')} and students' notes on them. This can't be undone.`
            : ''
        }
      />
    </div>
  );
}
