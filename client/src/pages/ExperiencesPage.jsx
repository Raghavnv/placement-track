import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, PenLine, Search, X } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Pagination from '../components/common/Pagination';
import { CardSkeleton, EmptyState, ErrorState } from '../components/common/States';
import ExperienceCard from '../components/student/ExperienceCard';
import ExperienceForm from '../components/student/ExperienceForm';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { deleteExperience, listExperienceCompanies, listExperiences } from '../services/experienceService';
import { pluralize } from '../utils/format';

const PAGE_SIZE = 10;

// Interview experiences: students read and share; officers read and remove.
export default function ExperiencesPage() {
  useDocumentTitle('Interview experiences');
  const { user } = useAuth();
  const toast = useToast();
  const isStudent = user.role === 'student';
  const [params, setParams] = useSearchParams();
  const company = params.get('company') || '';
  const page = Number(params.get('page')) || 1;
  const [searchText, setSearchText] = useState(params.get('q') || '');
  const search = useDebounce(searchText.trim(), 300);
  const [writing, setWriting] = useState(params.get('write') === '1');
  const [toDelete, setToDelete] = useState(null);

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

  const { data, error, loading, reload } = useAsync(() => listExperiences({ company, search, page, limit: PAGE_SIZE }), [company, search, page]);
  const { data: companies, reload: reloadCompanies } = useAsync(listExperienceCompanies, []);

  const remove = async () => {
    await deleteExperience(toDelete._id);
    toast.success('Experience deleted');
    setToDelete(null);
    reload();
    reloadCompanies();
  };
  const onDelete = Object.assign((exp) => setToDelete(exp), { any: !isStudent });

  return (
    <div className="page">
      <PageHeader
        title="Interview experiences"
        description="How each company's selection process really went, round by round, written by students who sat it."
        actions={
          isStudent && (
            <Button icon={PenLine} onClick={() => setWriting(true)}>
              Share your experience
            </Button>
          )
        }
      />

      <div className="toolbar card toolbar--stack">
        <div className="search-input">
          <Search size={18} aria-hidden="true" />
          <input type="search" className="input" placeholder="Search company or role" aria-label="Search company or role" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        {companies?.length > 0 && (
          <div className="chip-select" role="group" aria-label="Companies">
            {companies.map((c) => (
              <button
                key={c.companyName}
                type="button"
                className={`chip-toggle ${company.toLowerCase() === c.companyName.toLowerCase() ? 'is-on' : ''}`}
                aria-pressed={company.toLowerCase() === c.companyName.toLowerCase()}
                onClick={() => setParam('company', company.toLowerCase() === c.companyName.toLowerCase() ? '' : c.companyName)}
              >
                {c.companyName} <span className="chip-toggle__count">{c.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (company || search) && (
        <p className="result-count">
          {pluralize(data.pagination.total, 'experience')}
          {company && ` for ${company}`}
          <button type="button" className="text-link" onClick={() => { setSearchText(''); setParams({}, { replace: true }); }}>
            <X size={14} aria-hidden="true" /> Clear
          </button>
        </p>
      )}

      {loading && !data ? (
        <CardSkeleton lines={4} />
      ) : data?.data.length ? (
        <div className={`experience-list ${loading ? 'is-refreshing' : ''}`}>
          {data.data.map((exp) => (
            <ExperienceCard key={exp._id} experience={exp} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        data && (
          <div className="card">
            <EmptyState
              icon={BookOpen}
              title={company || search ? 'No experiences match' : 'No experiences shared yet'}
              description={isStudent ? 'Been through a drive? Write up the rounds while you still remember them.' : 'Students share these after their drives.'}
              action={isStudent && <Button onClick={() => setWriting(true)} icon={PenLine}>Share your experience</Button>}
            />
          </div>
        )
      )}

      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={(p) => setParam('page', String(p))} />}

      {isStudent && writing && (
        <ExperienceForm
          open
          initialCompany={company}
          onClose={() => setWriting(false)}
          onCreated={() => {
            setWriting(false);
            reload();
            reloadCompanies();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this experience?"
        description="It disappears for everyone. This can't be undone."
        confirmLabel="Delete"
        onConfirm={remove}
        onClose={() => setToDelete(null)}
        tone="danger"
      />
    </div>
  );
}
