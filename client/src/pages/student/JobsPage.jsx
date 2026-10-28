import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Globe, Info, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/States';
import JobCard from '../../components/student/JobCard';
import useAsync from '../../hooks/useAsync';
import useDebounce from '../../hooks/useDebounce';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useSlashFocus from '../../hooks/useSlashFocus';
import { searchJobs } from '../../services/jobService';
import { formatNumber } from '../../utils/format';

const PAGE_SIZE = 12;
const ANYWHERE = 'anywhere';
const CITIES = ['Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Mumbai', 'Delhi', 'Kolkata'];
const TYPE_OPTIONS = [
  { value: '', label: 'Any job type' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
];
const SALARY_OPTIONS = [
  { value: '', label: 'Any salary' },
  { value: '4', label: '₹4 LPA +' },
  { value: '6', label: '₹6 LPA +' },
  { value: '10', label: '₹10 LPA +' },
  { value: '15', label: '₹15 LPA +' },
];
const SORT_OPTIONS = [
  { value: 'match', label: 'Best match' },
  { value: 'date', label: 'Newest first' },
  { value: 'salary', label: 'Salary: highest' },
];

// Jobs outside campus placements, from Adzuna. Applying happens on the company's site.
export default function JobsPage() {
  useDocumentTitle('Jobs');
  const [params, setParams] = useSearchParams();
  const searchRef = useRef(null);
  useSlashFocus(searchRef);

  const filters = {
    q: params.get('q') || '',
    location: params.get('loc') || '',
    jobType: params.get('type') || '',
    minSalary: params.get('min') || '',
    sort: params.get('sort') || 'match',
    page: Number(params.get('page')) || 1,
  };

  const [searchText, setSearchText] = useState(filters.q);
  const debouncedSearch = useDebounce(searchText.trim(), 400);

  const setFilter = (key, value) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === '' || value === null) next.delete(key);
        else next.set(key, value);
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
    () => searchJobs({ ...filters, limit: PAGE_SIZE }),
    [filters.q, filters.location, filters.jobType, filters.minSalary, filters.sort, filters.page],
  );

  const search = data?.search;
  // With no city picked, show the one the server used (the profile city for "for you"), else "All of India".
  const locationValue = filters.location || search?.location || ANYWHERE;
  const cities = search?.location && !CITIES.includes(search.location) ? [search.location, ...CITIES] : CITIES;

  const pickSuggestion = (text) => {
    setSearchText(text);
    setFilter('q', text);
  };

  const hasFilters = filters.q || filters.location || filters.jobType || filters.minSalary;
  const clearFilters = () => {
    setSearchText('');
    setParams({}, { replace: true });
  };

  const notConfigured = error?.code === 'JOBS_NOT_CONFIGURED';

  return (
    <div className="page">
      <PageHeader
        title="Jobs"
        description="Live openings from across India, ranked against your profile. Separate from the drives your placement cell runs."
        actions={
          <Button as={Link} to="/onboarding?edit=1" variant="secondary" icon={SlidersHorizontal}>
            Tune my matches
          </Button>
        }
      />

      <p className="jobs-note">
        <Info size={16} aria-hidden="true" />
        These listings aren't campus drives. You apply on the company's own site, so they won't appear on your applications board.
      </p>

      <div className="toolbar card">
        <div className="search-input">
          <Search size={18} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            className="input"
            placeholder="Search a role, skill or company"
            aria-label="Search a role, skill or company"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <kbd className="search-input__kbd" aria-hidden="true">/</kbd>
        </div>
        <div className="toolbar__row">
          <select className="input select select--sm" aria-label="Location" value={locationValue} onChange={(e) => setFilter('loc', e.target.value)}>
            <option value={ANYWHERE}>All of India</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          {[
            ['type', 'Job type', filters.jobType, TYPE_OPTIONS],
            ['min', 'Minimum salary', filters.minSalary, SALARY_OPTIONS],
          ].map(([key, label, value, options]) => (
            <select key={key} className="input select select--sm" aria-label={label} value={value} onChange={(e) => setFilter(key, e.target.value)}>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}
          <select className="input select select--sm" aria-label="Sort by" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value === 'match' ? '' : e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {search?.suggestions.length > 0 && (
          <div className="jobs-suggestions">
            <span className="jobs-suggestions__label">
              <Sparkles size={14} aria-hidden="true" /> From your profile
            </span>
            <div className="chip-select">
              {search.suggestions.map((text) => (
                <button
                  key={text}
                  type="button"
                  className={`chip-toggle ${search.keywords.toLowerCase() === text.toLowerCase() ? 'is-on' : ''}`}
                  aria-pressed={search.keywords.toLowerCase() === text.toLowerCase()}
                  onClick={() => pickSuggestion(text)}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {notConfigured ? (
        <div className="card">
          <EmptyState icon={Globe} title="Job search isn't switched on yet" description={error.message} />
        </div>
      ) : (
        error && <ErrorState error={error} onRetry={reload} />
      )}

      {data && !error && (
        <p className="result-count" aria-live="polite">
          {formatNumber(data.pagination.total)} {data.pagination.total === 1 ? 'job' : 'jobs'}
          {search.mode === 'for-you' && search.keywords && ` · ${search.keywords}${search.location ? ` in ${search.location}` : ''}, picked for you`}
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
          {data.data.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        data &&
        !error && (
          <div className="card">
            <EmptyState
              icon={Globe}
              title="No jobs found"
              description="Try a broader search, another city, or remove a filter."
              action={hasFilters && <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
            />
          </div>
        )
      )}

      {data && !error && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onChange={(page) => {
            setFilter('page', String(page));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      <p className="jobs-credit">
        Listings from{' '}
        <a href="https://www.adzuna.in" target="_blank" rel="noopener noreferrer">
          Adzuna
        </a>
        . Salaries marked “estimated” are Adzuna's guess, not the employer's.
      </p>
    </div>
  );
}
