import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessagesSquare } from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { ErrorState } from '../common/States';
import { startInterview } from '../../services/interviewService';

// Starts an AI mock interview for one drive or outside job, then opens the interview room.
// target: { driveId } or { job: {...} }
export default function InterviewButton({ target, variant = 'secondary', size = 'md', block = false, label = 'Practice interview' }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ open: false, error: null });

  const start = async () => {
    setState({ open: true, error: null });
    try {
      const interview = await startInterview(target);
      navigate(`/student/interviews/${interview._id}`);
    } catch (error) {
      setState({ open: true, error });
    }
  };

  return (
    <>
      <Button variant={variant} size={size} block={block} icon={MessagesSquare} onClick={start} loading={state.open && !state.error}>
        {label}
      </Button>
      <Modal open={state.open} onClose={() => state.error && setState({ open: false, error: null })} title="Mock interview" size="sm">
        {state.error ? (
          <ErrorState error={state.error} title="Couldn't start the interview" onRetry={start} />
        ) : (
          <div className="coach-loading">
            <Spinner size="lg" label="Writing your interview" />
            <p>Your interviewer is reading the job posting and your resume, and writing questions for this role. About 20 seconds.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
