import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, RotateCw, Sparkles } from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { ErrorState } from '../common/States';
import { useToast } from '../../context/ToastContext';
import { checkFit } from '../../services/coachService';
import { timeAgo } from '../../utils/format';

const RESUME_ERRORS = ['NO_RESUME', 'RESUME_NOT_PDF', 'RESUME_UNREADABLE'];

export function CopyButton({ text, label = 'Copy' }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.");
    }
  };
  return (
    <button type="button" className="copy-btn" onClick={copy} aria-label={copied ? 'Copied' : `${label}: ${text}`}>
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

const tone = (score) => (score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low');

function FitResult({ fit, onRefresh, refreshing }) {
  return (
    <div className="fit-result">
      <div className="fit-result__head">
        <p className={`coach-score coach-score--${tone(fit.fitScore)}`}>
          <strong>{fit.fitScore}</strong>
          <span>/100 fit</span>
        </p>
        <p className="fit-result__verdict">{fit.verdict}</p>
      </div>

      {fit.strengths.length > 0 && (
        <section>
          <h3 className="coach-subhead">What works for this role</h3>
          <ul className="coach-list coach-list--good">
            {fit.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {fit.gaps.length > 0 && (
        <section>
          <h3 className="coach-subhead">Gaps to close</h3>
          <ul className="fit-gaps">
            {fit.gaps.map((gap) => (
              <li key={gap.area}>
                <strong>{gap.area}</strong>
                <span>{gap.howToClose}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fit.tailoredBullets.length > 0 && (
        <section>
          <h3 className="coach-subhead">Bullets tailored for this role</h3>
          <ul className="coach-bullets">
            {fit.tailoredBullets.map((bullet) => (
              <li key={bullet}>
                <span>{bullet}</span>
                <CopyButton text={bullet} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {fit.talkingPoints.length > 0 && (
        <section>
          <h3 className="coach-subhead">Bring these up in the interview</h3>
          <ul className="coach-list">
            {fit.talkingPoints.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="coach-meta">
        Checked {timeAgo(fit.checkedAt)} · AI suggestions, so double-check before you use them.
        <button type="button" className="text-link" onClick={onRefresh} disabled={refreshing}>
          <RotateCw size={13} aria-hidden="true" /> Check again
        </button>
      </p>
    </div>
  );
}

// "How do I fit?": opens a dialog that compares the student's resume with one drive or job.
// target: { driveId } or { job: { id, title, company, location, description, skills } }
export default function FitCheckButton({ target, title, variant = 'secondary', size = 'md', block = false }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ fit: null, error: null, loading: false });

  const run = async (refresh = false) => {
    setState((s) => ({ ...s, error: null, loading: true }));
    try {
      setState({ fit: await checkFit(target, refresh), error: null, loading: false });
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
    }
  };

  const openDialog = () => {
    setOpen(true);
    if (!state.fit && !state.loading) run();
  };

  const resumeProblem = RESUME_ERRORS.includes(state.error?.code);

  return (
    <>
      <Button variant={variant} size={size} block={block} icon={Sparkles} onClick={openDialog}>
        How do I fit?
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="How do I fit?" description={title} size="lg">
        {state.loading && (
          <div className="coach-loading">
            <Spinner label="Comparing your resume with this role" />
            <p>Reading your resume against this role. This takes up to half a minute.</p>
          </div>
        )}
        {!state.loading && state.error && (
          <div className="coach-error">
            <ErrorState error={state.error} title={resumeProblem ? 'Your resume needs attention' : "Couldn't check your fit"} onRetry={resumeProblem ? undefined : () => run()} />
            {resumeProblem && (
              <Button as={Link} to="/student/profile#resume" variant="secondary" size="sm">
                Go to my resume
              </Button>
            )}
          </div>
        )}
        {!state.loading && state.fit && !state.error && <FitResult fit={state.fit} onRefresh={() => run(true)} refreshing={state.loading} />}
      </Modal>
    </>
  );
}
