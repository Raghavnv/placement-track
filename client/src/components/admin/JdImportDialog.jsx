import { useRef, useState } from 'react';
import { FileText, Sparkles, UploadCloud } from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { Segmented, TextareaField } from '../common/Field';
import { InlineAlert } from '../common/States';
import { parseJobDescription } from '../../services/driveService';

const MAX_BYTES = 5 * 1024 * 1024;

// Paste a job description or upload its PDF; the AI drafts the drive form for the officer to review.
export default function JdImportDialog({ open, onClose, onDraft }) {
  const [mode, setMode] = useState('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const pick = (chosen) => {
    setError('');
    if (!chosen) return;
    if (!/\.pdf$/i.test(chosen.name) && chosen.type !== 'application/pdf') return setError('Choose a PDF file.');
    if (chosen.size > MAX_BYTES) return setError('That PDF is over 5 MB.');
    setFile(chosen);
  };

  const run = async () => {
    setError('');
    setBusy(true);
    try {
      onDraft(await parseJobDescription(mode === 'paste' ? text : file));
      setText('');
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const ready = mode === 'paste' ? text.trim().length >= 80 : Boolean(file);

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Fill from job description"
      description="Paste the company's JD or upload it. The AI fills the form; you review every field before publishing."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button icon={Sparkles} onClick={run} loading={busy} disabled={!ready}>
            Fill the form
          </Button>
        </>
      }
    >
      {busy ? (
        <div className="coach-loading">
          <Spinner size="lg" label="Reading the job description" />
          <p>Reading the job description. About 15 seconds.</p>
        </div>
      ) : (
        <div className="form-stack">
          <Segmented
            label="Source"
            name="jd-source"
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'paste', label: 'Paste text' },
              { value: 'upload', label: 'Upload PDF' },
            ]}
          />
          {mode === 'paste' ? (
            <TextareaField
              label="Job description"
              rows={10}
              maxLength={20000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full JD: role, CTC, eligibility, skills, location, last date…"
            />
          ) : (
            <button type="button" className="resume-drop" onClick={() => inputRef.current?.click()}>
              <span className="resume-drop__icon" aria-hidden="true">
                {file ? <FileText size={22} /> : <UploadCloud size={22} />}
              </span>
              <span className="resume-drop__text">
                <strong>{file ? file.name : 'Choose the JD as a PDF'}</strong>
                <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB · click to change` : 'Text-based PDF, up to 5 MB'}</span>
              </span>
              <input ref={inputRef} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
            </button>
          )}
          {error && <InlineAlert>{error}</InlineAlert>}
          <p className="coach-meta">The JD text is sent to an AI model hosted by Groq. Nothing is published until you press Publish drive.</p>
        </div>
      )}
    </Modal>
  );
}
