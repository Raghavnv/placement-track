import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Lock, Send } from 'lucide-react';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import { DeadlineChip } from '../common/Badges';
import { useToast } from '../../context/ToastContext';
import { applyToDrive } from '../../services/driveService';
import { formatDateTime, formatPackage } from '../../utils/format';

function applyState(drive) {
  if (drive.hasApplied) return { key: 'applied' };
  if (drive.status === 'closed') return { key: 'blocked', icon: Lock, reason: 'This drive is closed for applications.' };
  if (new Date(drive.deadline) < new Date()) {
    return { key: 'blocked', icon: Clock, reason: `Applications closed on ${formatDateTime(drive.deadline)}.` };
  }
  if (!drive.isEligible) {
    const failed = (drive.eligibilityChecks || []).filter((c) => !c.passed).map((c) => c.label);
    return { key: 'blocked', icon: Lock, reason: `You don't meet: ${failed.join(', ')}.` };
  }
  return { key: 'open' };
}

export default function ApplyPanel({ drive, onApplied }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const state = applyState(drive);

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyToDrive(drive._id);
      toast.success(`Applied to ${drive.companyName}. Track it on your board.`);
      setConfirming(false);
      onApplied();
    } catch (error) {
      toast.error(error.message);
      setConfirming(false);
      if (['ALREADY_APPLIED', 'DRIVE_CLOSED', 'DEADLINE_PASSED', 'NOT_ELIGIBLE'].includes(error.code)) onApplied();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="card apply-panel">
      <div className="apply-panel__package">
        <span className="muted">Package</span>
        <strong>{formatPackage(drive.package)}</strong>
      </div>
      <dl className="apply-panel__facts">
        <div>
          <dt>
            <Clock size={15} aria-hidden="true" /> Deadline
          </dt>
          <dd>
            {formatDateTime(drive.deadline)}
            <DeadlineChip deadline={drive.deadline} compact />
          </dd>
        </div>
        {drive.driveDate && (
          <div>
            <dt>
              <CalendarDays size={15} aria-hidden="true" /> Drive date
            </dt>
            <dd>{formatDateTime(drive.driveDate)}</dd>
          </div>
        )}
      </dl>

      <div className="apply-panel__action">
        {state.key === 'applied' && (
          <>
            <Button variant="success" block disabled icon={CheckCircle2}>
              Applied
            </Button>
            <Link to="/student/applications" className="apply-panel__link">
              Track on your board <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </>
        )}
        {state.key === 'blocked' && (
          <>
            <Button block disabled icon={state.icon}>
              Can't apply
            </Button>
            <p className="apply-panel__reason">{state.reason}</p>
          </>
        )}
        {state.key === 'open' && (
          <Button block size="lg" icon={Send} onClick={() => setConfirming(true)}>
            Apply now
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleApply}
        loading={applying}
        title={`Apply to ${drive.companyName}?`}
        description={`${drive.role} · ${formatPackage(drive.package)}. Your profile will be shared with the placement cell.`}
        confirmLabel="Apply"
      />
    </div>
  );
}
