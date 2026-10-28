import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, FileText, GraduationCap, Mail, Phone } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { CompanyAvatar, UserAvatar } from '../common/Avatar';
import { Badge, StageBadge } from '../common/Badges';
import { EmptyState, ErrorState, Skeleton } from '../common/States';
import ProfileCard from '../student/ProfileCard';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import { getStudent, getStudentResume } from '../../services/adminService';
import { formatDate, formatPackage, pluralize } from '../../utils/format';
import { openFileInNewTab } from '../../utils/openFile';
import { appliedAt } from '../../utils/stages';

// Officer's side panel for one student: contact, resume, every application, and their onboarding profile.
export default function StudentDrawer({ studentId, onClose }) {
  const toast = useToast();
  const [opening, setOpening] = useState(false);
  const { data, error, loading, reload } = useAsync(() => getStudent(studentId), [studentId]);
  const student = data?.student;
  const applications = data?.applications || [];
  const offers = applications.filter((a) => a.stage === 'offer');
  const best = offers.reduce((max, a) => Math.max(max, a.drive?.package || 0), 0);

  const viewResume = async () => {
    setOpening(true);
    try {
      await openFileInNewTab(() => getStudentResume(studentId));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOpening(false);
    }
  };

  return (
    <Modal
      open
      variant="drawer"
      size="lg"
      onClose={onClose}
      title={student ? student.name : 'Student'}
      description={student ? `${student.rollNumber} · ${student.branch} · Batch of ${student.graduationYear}` : undefined}
      headerExtra={student && <UserAvatar name={student.name} size="lg" />}
    >
      {error && <ErrorState error={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="form-stack">
          <Skeleton height={90} radius={12} />
          <Skeleton height={160} radius={12} />
        </div>
      ) : (
        student && (
          <>
            <div className="drawer-section drawer-summary">
              {offers.length ? (
                <Badge tone="success">
                  Placed · {pluralize(offers.length, 'offer')} · best {formatPackage(best)}
                </Badge>
              ) : (
                <Badge tone="neutral">Not placed yet</Badge>
              )}
              <ul className="meta-list">
                <li>
                  <Mail size={15} aria-hidden="true" />
                  <a href={`mailto:${student.email}`} className="text-link">
                    {student.email}
                  </a>
                </li>
                {student.phone && (
                  <li>
                    <Phone size={15} aria-hidden="true" />
                    <a href={`tel:${student.phone}`} className="text-link">
                      {student.phone}
                    </a>
                  </li>
                )}
                {student.college && (
                  <li>
                    <GraduationCap size={15} aria-hidden="true" />
                    {student.college}
                  </li>
                )}
              </ul>
              {student.resume ? (
                <Button variant="secondary" size="sm" icon={FileText} onClick={viewResume} loading={opening} title={student.resume.fileName}>
                  View resume
                </Button>
              ) : (
                <span className="muted">No resume uploaded yet</span>
              )}
            </div>

            <div className="drawer-section">
              <h3 className="section-title">Applications ({applications.length})</h3>
              {applications.length ? (
                <ul className="rank-list student-apps">
                  {applications.map((application) => (
                    <li key={application._id}>
                      <CompanyAvatar name={application.drive?.companyName || '?'} size="sm" />
                      <Link to={`/admin/drives/${application.drive?._id}/applicants`} className="rank-list__text" onClick={onClose}>
                        <strong>{application.drive?.companyName || 'Deleted drive'}</strong>
                        <span>
                          {application.drive?.role} · {formatPackage(application.drive?.package)} · applied {formatDate(appliedAt(application))}
                        </span>
                      </Link>
                      <StageBadge stage={application.stage} size="sm" />
                      <ArrowRight size={16} aria-hidden="true" className="student-apps__arrow" />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={Briefcase} title="No applications yet" description="This student hasn't applied to any drive." />
              )}
            </div>

            <div className="drawer-section">
              <h3 className="section-title">Profile</h3>
              <ProfileCard user={student} />
            </div>
          </>
        )
      )}
    </Modal>
  );
}
