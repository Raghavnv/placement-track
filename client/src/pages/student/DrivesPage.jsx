import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Briefcase, Search, SlidersHorizontal, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { Segmented, Switch } from '../../components/common/Field';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/States';
import DriveCard from '../../components/student/DriveCard';
import PlacementStatus from '../../components/student/PlacementStatus';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useSlashFocus from '../../hooks/useSlashFocus';
import { listDrives } from '../../services/driveService';
import { pluralize } from '../../utils/format';

const PAGE_SIZE = 9;
const PACKAGE_OPTIONS = [
  { value: '', label: 'Any package' },
  { value: '4', label: '₹4 LPA +' },
  { value: '6', label: '₹6 LPA +' },
  { value: '8', label: '₹8 LPA +' },
  { value: '12', label: '₹12 LPA +' },
];
const SORT_OPTIONS = [
  { value: 'match', label: 'Best match' },
  { value: 'deadline', label: 'Deadline: soonest' },
  { value: '-package', label: 'Package: highest' },
  { value: '-createdAt', label: 'Newest first' },
];

export default function DrivesPage() {
  useDocumentTitle('Drives');
  const [params, setParams] = useSearchParams();
  const searchRef = useRef(null);
  useSlashFocus(searchRef);

  const filters = {
    q: params.get('q') || '',
    type: params.get('type') || '',
    minPackage: params.get('min') || '',
    eligible: params.get('eligible') === '1',
    sort: params.get('sort') || 'match',
    page: Number(params.get('page')) || 1,
  };

  const [searchText, setSearchText] = useState(filters.q);
  const debouncedSearch = useDebounce(searchText.trim(), 300);

  const setFilter = (key, value) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === '' || value === false || value === null) next.delete(key);
        else next.set(key, value === true ? '1' : value);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (debouncedSearch !== filters.q) setFilter('q', debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const { data, error, loading, reload } = useAsync(
    () =>
      listDrives({
        search: filters.q,
        jobType: filters.type,
        minPackage: filters.minPackage,
        eligibleOnly: filters.eligible,
        sort: filters.sort,
        page: filters.page,
        limit: PAGE_SIZE,
      }),
    [filters.q, filters.type, filters.minPackage, filters.eligible, filters.sort, filters.page],
  );

  const hasFilters = filters.q || filters.type || filters.minPackage || filters.eligible;
  const clearFilters = () => {
    setSearchText('');
    setParams({}, { replace: true });
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Live drives"
        title={
          <>
            Find your <mark>next offer.</mark>
          </>
        }
        description="Ranked by how well each drive fits your skills, interests and goals."
        actions={
          <Button as={Link} to="/onboarding?edit=1" variant="secondary" icon={SlidersHorizontal}>
            Tune my matches
          </Button>
        }
      />

      <PlacementStatus variant="notice" />

      <div className="toolbar card">
        <div className="search-input">
          <Search size={18} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            className="input"
            placeholder="Search company or role"
            aria-label="Search company or role"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <kbd className="search-input__kbd" aria-hidden="true">/</kbd>
        </div>
        <div className="toolbar__row">
          <Segmented
            label="Job type"
            name="jobType"
            size="sm"
            value={filters.type}
            onChange={(value) => setFilter('type', value)}
            options={[
              { value: '', label: 'All' },
              { value: 'full-time', label: 'Full-time' },
              { value: 'internship', label: 'Internship' },
            ]}
          />
          <select className="input select select--sm" aria-label="Minimum package" value={filters.minPackage} onChange={(e) => setFilter('min', e.target.value)}>
            {PACKAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className="input select select--sm" aria-label="Sort by" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value === 'match' ? '' : e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Switch label="Eligible only" checked={filters.eligible} onChange={(checked) => setFilter('eligible', checked)} />
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <p className="result-count" aria-live="polite">
          {pluralize(data.pagination.total, 'drive')}
          {hasFilters && (
            <button type="button" className="text-link" onClick={clearFilters}>
              <X size={14} aria-hidden="true" /> Clear filters
            </button>
          )}
        </p>
      )}

      {loading && !data ? (
        <div className="card-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : data?.data.length ? (
        <div className={`card-grid ${loading ? 'is-refreshing' : ''}`}>
          {data.data.map((drive) => (
            <DriveCard key={drive._id} drive={drive} />
          ))}
        </div>
      ) : (
        data && (
          <div className="card">
            <EmptyState
              icon={Briefcase}
              title={hasFilters ? 'No drives match your filters' : 'No open drives right now'}
              description={hasFilters ? 'Try a different search or remove a filter.' : 'New drives appear here as soon as the placement cell posts them.'}
              action={hasFilters && <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
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
          onChange={(page) => {
            setFilter('page', String(page));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
