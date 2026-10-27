import { useNavigate, useParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
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
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      {isEdit && loading ? (
        <CardSkeleton lines={8} />
      ) : (
        (!isEdit || drive) && <DriveForm drive={drive} onSubmit={handleSubmit} submitLabel={isEdit ? 'Save changes' : 'Publish drive'} />
      )}
    </div>
  );
}
