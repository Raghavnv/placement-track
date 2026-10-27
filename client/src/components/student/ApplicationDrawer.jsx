import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CalendarDays, ExternalLink, MapPin, Send } from 'lucide-react';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import { CompanyAvatar } from '../common/Avatar';
import { StageBadge } from '../common/Badges';
import StageTimeline from './StageTimeline';
import NotesEditor from './NotesEditor';
import { formatDate, formatDateTime, formatPackage } from '../../utils/format';
import { jobTypeLabel } from '../../utils/constants';
import { appliedAt } from '../../utils/stages';

export default function ApplicationDrawer({ application, onClose, onUpdated }) {
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const handleDirty = useCallback((value) => setDirty(value), []);

  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose());

  if (!application) return null;
  const { drive } = application;

  return (
    <>
      <Modal
        open
        variant="drawer"
        size="lg"
        onClose={requestClose}
        title={drive.companyName}
        description={drive.role}
        headerExtra={<CompanyAvatar name={drive.companyName} size="lg" />}
      >
        <div className="drawer-section drawer-summary">
          <StageBadge stage={application.stage} />
          <ul className="meta-list">
            <li>
              <Briefcase size={15} aria-hidden="true" />
              {formatPackage(drive.package)} · {jobTypeLabel(drive.jobType)}
            </li>
            {drive.location && (
              <li>
                <MapPin size={15} aria-hidden="true" />
                {drive.location}
              </li>
            )}
            <li>
              <Send size={15} aria-hidden="true" />
              Applied {formatDate(appliedAt(application))}
            </li>
            {drive.driveDate && (
              <li>
                <CalendarDays size={15} aria-hidden="true" />
                Drive day {formatDateTime(drive.driveDate)}
              </li>
            )}
          </ul>
          <Link to={`/student/drives/${drive._id}`} className="text-link">
            View drive details <ExternalLink size={14} aria-hidden="true" />
          </Link>
        </div>

        <div className="drawer-section">
          <h3 className="section-title">Progress</h3>
          <StageTimeline history={application.stageHistory} />
        </div>

        <div className="drawer-section">
          <NotesEditor key={application._id} application={application} onSaved={onUpdated} onDirtyChange={handleDirty} />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        title="Discard unsaved notes?"
        description="Your latest changes to the prep notes haven't been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="danger"
      />
    </>
  );
}
