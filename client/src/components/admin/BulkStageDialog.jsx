import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { SelectField, TextareaField } from '../common/Field';
import { StageBadge } from '../common/Badges';
import { InlineAlert } from '../common/States';
import { REMARK_PLACEHOLDER } from './StageControl';
import { bulkMoveApplicants } from '../../services/driveService';
import { pluralize } from '../../utils/format';
import { STAGE_LABELS, TRANSITIONS } from '../../utils/stages';

const TARGETS = ['aptitude', 'interview', 'offer', 'rejected'];

// Roll numbers pasted from an email or a spreadsheet column: split on new lines, commas, tabs and spaces.
const parseRollNumbers = (text) => [...new Set(text.split(/[\s,;]+/).map((r) => r.trim().toUpperCase()).filter(Boolean))];

function Result({ result }) {
  const { stage, moved, skipped, notFound } = result;
  return (
    <div className="form-stack bulk-result">
      <div className="bulk-result__moved">
        <CheckCircle2 size={22} aria-hidden="true" />
        <p>
          {stage === 'rejected' ? (
            <>
              <strong>{pluralize(moved, 'applicant')}</strong> marked as not selected.
            </>
          ) : (
            <>
              Moved <strong>{pluralize(moved, 'applicant')}</strong> to <StageBadge stage={stage} size="sm" />
            </>
          )}
        </p>
      </div>

      {skipped.length > 0 && (
        <section>
          <h3 className="bulk-result__label">Skipped ({skipped.length})</h3>
          <ul className="bulk-result__list">
            {skipped.map((s) => (
              <li key={s.applicationId}>
                <span>
                  <strong>{s.name}</strong> <span className="table__mono">{s.rollNumber}</span>
                </span>
                <span className="muted">{s.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notFound.length > 0 && (
        <section>
          <h3 className="bulk-result__label">Not applicants of this drive ({notFound.length})</h3>
          <p className="bulk-result__chips">
            {notFound.map((roll) => (
              <span key={roll} className="table__mono">
                {roll}
              </span>
            ))}
          </p>
        </section>
      )}
    </div>
  );
}

// Moves many applicants of one drive at once: either the ticked rows (selection + stage)
// or a pasted list of roll numbers, e.g. the shortlist a company sends back.
export default function BulkStageDialog({ open, onClose, driveId, selection, stage: presetStage, onDone }) {
  const pasteMode = !selection;
  const [stage, setStage] = useState(presetStage || '');
  const [rollText, setRollText] = useState('');
  const [remark, setRemark] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const target = pasteMode ? stage : presetStage;
  const rollNumbers = parseRollNumbers(rollText);
  const movable = selection ? selection.filter((a) => TRANSITIONS[a.stage].includes(target)) : [];
  const count = pasteMode ? rollNumbers.length : movable.length;

  const close = () => {
    if (saving) return;
    if (result) onDone(result);
    onClose();
  };

  const submit = async () => {
    const nextErrors = {};
    if (pasteMode && !rollNumbers.length) nextErrors.rollNumbers = 'Paste at least one roll number';
    if (pasteMode && !stage) nextErrors.stage = 'Choose where to move them';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const body = { stage: target, remark: remark.trim() };
      if (pasteMode) body.rollNumbers = rollNumbers;
      else body.applicationIds = movable.map((a) => a._id);
      setResult(await bulkMoveApplicants(driveId, body));
    } catch (err) {
      setErrors({ ...err.fieldErrors, form: err.code === 'VALIDATION_ERROR' ? '' : err.message });
    } finally {
      setSaving(false);
    }
  };

  // Group the ticked rows by their current stage for the "Applied ×10 → Aptitude Test" summary.
  const fromCounts = movable.reduce((acc, a) => ({ ...acc, [a.stage]: (acc[a.stage] || 0) + 1 }), {});
  const skippedCount = selection ? selection.length - movable.length : 0;
  const rejecting = target === 'rejected';

  let title = 'Move by roll numbers';
  if (result) title = 'Done';
  else if (!pasteMode) title = rejecting ? `Reject ${pluralize(count, 'applicant')}?` : `Move ${pluralize(count, 'applicant')} to ${STAGE_LABELS[target]}?`;

  return (
    <Modal
      open={open}
      onClose={close}
      size={pasteMode ? 'md' : 'sm'}
      title={title}
      description={pasteMode && !result ? 'Paste the shortlist the company sent. Everyone on it moves in one go.' : undefined}
      footer={
        result ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button variant={rejecting ? 'danger' : 'primary'} onClick={submit} loading={saving} disabled={!pasteMode && !count}>
              {rejecting ? `Reject ${count || ''}`.trim() : `Move ${count || ''}`.trim()}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <Result result={result} />
      ) : (
        <div className="form-stack">
          {errors.form && <InlineAlert>{errors.form}</InlineAlert>}

          {pasteMode ? (
            <>
              <TextareaField
                label="Roll numbers"
                rows={6}
                placeholder={'21CS045\n21CS012\n21IS033'}
                hint={rollNumbers.length ? `${pluralize(rollNumbers.length, 'roll number')} found` : 'One per line, or separated by commas or spaces. Copy straight from Excel.'}
                value={rollText}
                onChange={(e) => {
                  setRollText(e.target.value);
                  setErrors((errs) => ({ ...errs, rollNumbers: undefined }));
                }}
                error={errors.rollNumbers}
              />
              <SelectField
                label="Move them to"
                placeholder="Choose a stage"
                value={stage}
                onChange={(e) => {
                  setStage(e.target.value);
                  setErrors((errs) => ({ ...errs, stage: undefined }));
                }}
                error={errors.stage}
                options={TARGETS.map((s) => ({ value: s, label: s === 'rejected' ? 'Rejected (not selected)' : STAGE_LABELS[s] }))}
              />
              <p className="muted bulk-hint">Students who aren't at the stage just before it are skipped, and you'll see who.</p>
            </>
          ) : (
            <>
              <div className="stage-move stage-move--wrap">
                {Object.entries(fromCounts).map(([from, n]) => (
                  <span key={from} className="stage-move__from">
                    <StageBadge stage={from} /> <span className="table__mono">×{n}</span>
                  </span>
                ))}
                <ArrowRight size={16} aria-hidden="true" />
                <StageBadge stage={target} />
              </div>
              {skippedCount > 0 && (
                <p className="muted">
                  {pluralize(skippedCount, 'selected applicant')} can't move to {STAGE_LABELS[target]} and will be left as they are.
                </p>
              )}
            </>
          )}

          {target && (
            <TextareaField
              label="Remark for the students"
              hint="Shown on each student's timeline."
              rows={3}
              maxLength={300}
              value={remark}
              placeholder={REMARK_PLACEHOLDER[target]}
              onChange={(e) => setRemark(e.target.value)}
            />
          )}
          {rejecting && <p className="muted">This is final and can't be undone.</p>}
        </div>
      )}
    </Modal>
  );
}
