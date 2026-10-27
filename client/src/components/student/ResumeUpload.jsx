import { useRef, useState } from 'react';
import { Check, Eye, FileImage, FileText, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import Button from '../common/Button';
import { InlineAlert } from '../common/States';
import { useToast } from '../../context/ToastContext';
import { deleteResume, getResumeFile, uploadResume } from '../../services/profileService';
import { formatDate } from '../../utils/format';

const MAX_BYTES = 2 * 1024 * 1024; // matches server/src/utils/resume.js
const ACCEPT = '.pdf,.jpg,.jpeg,application/pdf,image/jpeg';

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

function checkFile(file) {
  const okType = ['application/pdf', 'image/jpeg'].includes(file.type) || /\.(pdf|jpe?g)$/i.test(file.name);
  if (!okType) return 'Only PDF or JPG files, please.';
  if (file.size > MAX_BYTES) return `That file is ${formatSize(file.size)}. Keep it under 2 MB.`;
  return '';
}

// Drop zone that becomes a file card once a resume is uploaded. Saves straight away (not with the onboarding answers).
export default function ResumeUpload({ resume, onChange }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(null); // { name, progress }
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const pick = () => inputRef.current?.click();

  const upload = async (file) => {
    if (!file) return;
    const problem = checkFile(file);
    setError(problem);
    if (problem) return;

    setUploading({ name: file.name, progress: 0 });
    try {
      const user = await uploadResume(file, (progress) => setUploading({ name: file.name, progress }));
      onChange(user);
      toast.success('Resume uploaded');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(null);
    }
  };

  const view = async () => {
    // Open the tab now, while we still have the click; popup blockers stop it after an await.
    const tab = window.open('', '_blank');
    setBusy('view');
    try {
      const url = URL.createObjectURL(await getResumeFile());
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      onChange(await deleteResume());
      setError('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    upload(event.dataTransfer.files?.[0]);
  };

  const isPdf = resume?.mimeType === 'application/pdf';
  const FileIcon = isPdf ? FileText : FileImage;

  return (
    <div className="resume-upload">
      <div className="field__label-row">
        <span className="field__label">Your resume</span>
        <span className="field__counter">PDF or JPG · max 2 MB</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {resume && !uploading ? (
        <div className="resume-file">
          <span className="resume-file__icon" aria-hidden="true">
            <FileIcon size={24} />
          </span>
          <div className="resume-file__text">
            <strong title={resume.fileName}>{resume.fileName}</strong>
            <span>
              {isPdf ? 'PDF' : 'JPG'} · {formatSize(resume.size)} · Added {formatDate(resume.uploadedAt)}
            </span>
          </div>
          <span className="resume-file__check" aria-hidden="true">
            <Check size={14} strokeWidth={3} />
          </span>
          <div className="resume-file__actions">
            <Button variant="secondary" size="sm" icon={Eye} onClick={view} loading={busy === 'view'}>
              View
            </Button>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={pick} disabled={Boolean(busy)}>
              Replace
            </Button>
            <Button variant="ghost-danger" size="sm" icon={Trash2} onClick={remove} loading={busy === 'remove'}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`resume-drop ${dragging ? 'is-dragging' : ''} ${uploading ? 'is-uploading' : ''}`}
          onClick={pick}
          disabled={Boolean(uploading)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className="resume-drop__icon" aria-hidden="true">
            <UploadCloud size={26} />
          </span>
          {uploading ? (
            <span className="resume-drop__text">
              <strong>Uploading {uploading.name}…</strong>
              <span className="resume-drop__progress" role="progressbar" aria-valuenow={uploading.progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${uploading.progress}%` }} />
              </span>
            </span>
          ) : (
            <span className="resume-drop__text">
              <strong>{dragging ? 'Drop it here' : 'Drag your resume here'}</strong>
              <span>
                or <u>browse your files</u>
              </span>
            </span>
          )}
          <span className="resume-drop__formats" aria-hidden="true">
            <span>PDF</span>
            <span>JPG</span>
          </span>
        </button>
      )}

      {error && <InlineAlert>{error}</InlineAlert>}
    </div>
  );
}
