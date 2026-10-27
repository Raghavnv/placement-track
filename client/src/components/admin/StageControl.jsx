import { useState } from 'react';
import { ArrowRight, XCircle } from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { TextareaField } from '../common/Field';
import { StageBadge } from '../common/Badges';
import { useToast } from '../../context/ToastContext';
import { updateStage } from '../../services/applicationService';
import { STAGE_LABELS, TRANSITIONS } from '../../utils/stages';

const REMARK_PLACEHOLDER = {
  aptitude: 'e.g. Online test on 5 Nov, 10 AM. Link will be emailed.',
  interview: 'e.g. Cleared aptitude. Interview slot will be shared by email.',
  offer: 'e.g. Selected! Offer letter sent to your registered email.',
  rejected: 'Optional, shown to the student. Keep it kind and useful.',
};

export default function StageControl({ application, onMoved }) {
  const toast = useToast();
  const [target, setTarget] = useState(null);
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const next = TRANSITIONS[application.stage];
  const advance = next.find((s) => s !== 'rejected');

  if (!next.length) return <span className="muted stage-control__final">Final</span>;

  const close = () => {
    if (saving) return;
    setTarget(null);
    setRemark('');
  };

  const confirm = async () => {
    setSaving(true);
    try {
      const updated = await updateStage(application._id, { stage: target, remark: remark.trim() });
      toast.success(
        target === 'rejected'
          ? `${application.student.name} marked as not selected`
          : `Moved ${application.student.name} to ${STAGE_LABELS[target]}`,
      );
      setTarget(null);
      setRemark('');
      onMoved(updated);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stage-control">
      {advance && (
        <Button size="sm" variant="soft" iconRight={ArrowRight} onClick={() => setTarget(advance)}>
          {STAGE_LABELS[advance]}
        </Button>
      )}
      <Button size="sm" variant="ghost-danger" icon={XCircle} onClick={() => setTarget('rejected')} aria-label={`Reject ${application.student.name}`}>
        <span className="stage-control__reject-label">Reject</span>
      </Button>

      <Modal
        open={Boolean(target)}
        onClose={close}
        size="sm"
        title={target === 'rejected' ? `Reject ${application.student.name}?` : `Move to ${STAGE_LABELS[target] || ''}?`}
        description={`${application.student.name} · ${application.student.rollNumber}`}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button variant={target === 'rejected' ? 'danger' : 'primary'} onClick={confirm} loading={saving}>
              {target === 'rejected' ? 'Reject' : `Move to ${STAGE_LABELS[target] || ''}`}
            </Button>
          </>
        }
      >
        {target && (
          <div className="form-stack">
            <div className="stage-move">
              <StageBadge stage={application.stage} />
              <ArrowRight size={16} aria-hidden="true" />
              <StageBadge stage={target} />
            </div>
            <TextareaField
              label="Remark for the student"
              hint="Shown on the student's timeline."
              rows={3}
              maxLength={300}
              value={remark}
              placeholder={REMARK_PLACEHOLDER[target]}
              onChange={(e) => setRemark(e.target.value)}
            />
            {target === 'rejected' && <p className="muted">This is final and can't be undone.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
