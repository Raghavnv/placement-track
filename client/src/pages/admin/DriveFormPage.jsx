import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SearchX, Sparkles } from 'lucide-react';
import Button from '../../components/common/Button';
import { InlineAlert } from '../../components/common/States';
import JdImportDialog from '../../components/admin/JdImportDialog';
import PageHeader from '../../components/common/PageHeader';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/States';
import DriveForm from '../../components/admin/DriveForm';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { createDrive, getDrive, updateDrive } from '../../services/driveService';

export default function DriveFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: drive, error, loading, reload } = useAsync(() => (isEdit ? getDrive(id) : Promise.resolve(null)), [id]);
  useDocumentTitle(isEdit ? `Edit ${drive?.companyName || 'drive'}` : 'New drive');

  const back = { to: '/admin/drives', label: 'All drives' };
  const [jdOpen, setJdOpen] = useState(false);
  const [imported, setImported] = useState(null); // { draft, missing, warnings, key }

  const onDraft = (result) => {
    const { draft } = result;
    // Leave the CGPA cutoff blank when the JD doesn't give one, instead of the form's default.
    const eligibility = { ...draft.eligibility, minCgpa: draft.eligibility.minCgpa ?? '', maxBacklogs: draft.eligibility.maxBacklogs ?? 0 };
    setImported({ ...result, draft: { ...draft, eligibility }, key: Date.now() });
    setJdOpen(false);
    toast.success('Form filled from the job description. Review it before publishing.');
  };

  const handleSubmit = async (payload) => {
    if (isEdit) {
      const updated = await updateDrive(id, payload);
      toast.success(`Saved changes to ${updated.companyName}`);
    } else {
      const created = await createDrive(payload);
      toast.success(`${created.companyName} is live for eligible students`);
    }
    navigate('/admin/drives');
  };

  if (isEdit && (error?.status === 404 || error?.code === 'INVALID_ID')) {
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
        title={isEdit ? `Edit ${drive?.companyName || 'drive'}` : 'Post a new drive'}
        description={isEdit ? 'Changes are visible to students immediately.' : 'Eligible students see it as soon as you save.'}
        actions={
          !isEdit && (
            <Button variant="secondary" icon={Sparkles} onClick={() => setJdOpen(true)}>
              Fill from job description
            </Button>
          )
        }
      />
      {imported && (imported.missing.length > 0 || imported.warnings.length > 0) && (
        <InlineAlert tone="warning">
          <strong>Check before publishing.</strong>
          {imported.missing.length > 0 && <> The JD didn't state the {imported.missing.join(', ')}, so fill {imported.missing.length > 1 ? 'those' : 'it'} in.</>}
          {imported.warnings.map((w) => (
            <span key={w} className="jd-warning">
              {w}
            </span>
          ))}
        </InlineAlert>
      )}
      <JdImportDialog open={jdOpen} onClose={() => setJdOpen(false)} onDraft={onDraft} />
      {error && <ErrorState error={error} onRetry={reload} />}
      {isEdit && loading ? (
        <CardSkeleton lines={8} />
      ) : (
        (!isEdit || drive) && (
          <DriveForm
            key={imported?.key || 'blank'}
            drive={drive}
            prefill={imported?.draft}
            onSubmit={handleSubmit}
            submitLabel={isEdit ? 'Save changes' : 'Publish drive'}
          />
        )
      )}
    </div>
  );
}
