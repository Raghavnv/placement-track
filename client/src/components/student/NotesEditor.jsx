import { useEffect, useId, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import Button from '../common/Button';
import { updateNotes } from '../../services/applicationService';
import { timeAgo } from '../../utils/format';

const MAX = 5000;

export default function NotesEditor({ application, onSaved, onDirtyChange }) {
  const id = useId();
  const [value, setValue] = useState(application.notes || '');
  const [saved, setSaved] = useState(application.notes || '');
  const [status, setStatus] = useState({ state: 'idle', at: null, error: '' });
  const textareaRef = useRef(null);
  const dirty = value !== saved;

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // Refresh the "saved 2m ago" label.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!status.at) return undefined;
    const timer = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(timer);
  }, [status.at]);

  const save = async () => {
    if (!dirty || status.state === 'saving') return;
    setStatus((s) => ({ ...s, state: 'saving', error: '' }));
    try {
      const updated = await updateNotes(application._id, value);
      setSaved(updated.notes);
      setStatus({ state: 'saved', at: new Date(), error: '' });
      onSaved?.(updated);
    } catch (error) {
      setStatus({ state: 'error', at: null, error: error.message });
    }
  };

  const onKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
    }
  };

  let statusText = 'Private to you. The placement cell never sees these notes.';
  if (status.state === 'saving') statusText = 'Saving…';
  else if (status.state === 'error') statusText = status.error;
  else if (dirty) statusText = 'Unsaved changes';
  else if (status.state === 'saved') statusText = `Saved · ${timeAgo(status.at)}`;

  return (
    <div className="notes-editor">
      <div className="field__label-row">
        <label htmlFor={id} className="field__label">
          Prep notes
        </label>
        <span className={`field__counter ${value.length > MAX * 0.9 ? 'is-near' : ''}`}>
          {value.length} / {MAX}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        className="input textarea notes-editor__input"
        rows={9}
        maxLength={MAX}
        value={value}
        placeholder={'Topics to revise, questions asked, contacts…\n\nTip: Ctrl/⌘ + S saves.'}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        aria-describedby={`${id}-status`}
      />
      <div className="notes-editor__bar">
        <p id={`${id}-status`} className={`notes-editor__status ${status.state === 'error' ? 'is-error' : ''} ${dirty ? 'is-dirty' : ''}`} aria-live="polite">
          {statusText}
        </p>
        <Button size="sm" icon={Save} onClick={save} disabled={!dirty} loading={status.state === 'saving'}>
          Save
        </Button>
      </div>
    </div>
  );
}
