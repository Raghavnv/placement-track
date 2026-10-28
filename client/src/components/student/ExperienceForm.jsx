import { useState } from 'react';
import { Plus, Send, Trash2 } from 'lucide-react';
import Button, { IconButton } from '../common/Button';
import Combobox from '../common/Combobox';
import Modal from '../common/Modal';
import { SelectField, Switch, TextareaField, TextField } from '../common/Field';
import { InlineAlert } from '../common/States';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import { getMyApplications } from '../../services/applicationService';
import { createExperience } from '../../services/experienceService';

const thisYear = new Date().getFullYear();
const EMPTY_ROUND = { name: '', details: '' };
const ROUND_IDEAS = ['Online test', 'Group discussion', 'Technical interview', 'HR interview'];

function validate(form) {
  const errors = {};
  if (form.companyName.trim().length < 2) errors.companyName = 'Enter the company name';
  if (form.role.trim().length < 2) errors.role = 'Enter the role';
  form.rounds.forEach((r, i) => {
    if (r.name.trim().length < 2) errors[`rounds.${i}.name`] = 'Name the round';
    if (r.details.trim().length < 20) errors[`rounds.${i}.details`] = 'Describe it in a sentence or two (20+ characters)';
  });
  return errors;
}

// "Share your experience": company (prefilled from drives the student applied to), rounds, tips.
export default function ExperienceForm({ open, onClose, onCreated, initialCompany = '' }) {
  const toast = useToast();
  const { data: apps } = useAsync(() => (open ? getMyApplications() : Promise.resolve(null)), [open]);
  const applied = (apps?.data || []).filter((a) => a.drive);
  const [form, setForm] = useState({
    companyName: initialCompany,
    role: '',
    year: String(thisYear),
    result: 'selected',
    difficulty: '3',
    rounds: [{ ...EMPTY_ROUND, name: ROUND_IDEAS[0] }],
    tips: '',
    anonymous: false,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setRound = (i, key, value) => setForm((f) => ({ ...f, rounds: f.rounds.map((r, j) => (j === i ? { ...r, [key]: value } : r)) }));
  const linked = applied.find((a) => a.drive.companyName.toLowerCase() === form.companyName.trim().toLowerCase());

  const chooseCompany = (name) => {
    const app = applied.find((a) => a.drive.companyName === name);
    setForm((f) => ({ ...f, companyName: name, role: app && !f.role ? app.drive.role : f.role }));
  };

  const submit = async () => {
    const next = validate(form);
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const experience = await createExperience({
        ...form,
        year: Number(form.year),
        difficulty: Number(form.difficulty),
        driveId: linked?.drive._id || null,
        rounds: form.rounds.map((r) => ({ name: r.name.trim(), details: r.details.trim() })),
      });
      toast.success('Thanks! Your experience is live for juniors.');
      onCreated(experience);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Share your interview experience"
      description="Round by round: what was asked and how it went. It helps juniors preparing for the same company."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button icon={Send} onClick={submit} loading={saving}>
            Publish
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {formError && !Object.keys(errors).length && <InlineAlert>{formError}</InlineAlert>}
        <div className="form-grid">
          <Combobox
            label="Company"
            required
            placeholder="e.g. Infosys"
            hint={linked ? 'Linked to the drive you applied to' : applied.length ? 'Pick a drive you applied to, or type any company' : undefined}
            options={[...new Set(applied.map((a) => a.drive.companyName))]}
            value={form.companyName}
            onChange={chooseCompany}
            error={errors.companyName}
          />
          <TextField label="Role" required value={form.role} onChange={(e) => set('role', e.target.value)} error={errors.role} placeholder="e.g. Systems Engineer" />
          <SelectField
            label="Result"
            value={form.result}
            onChange={(e) => set('result', e.target.value)}
            options={[
              { value: 'selected', label: 'Selected' },
              { value: 'not-selected', label: 'Not selected' },
              { value: 'awaiting', label: 'Awaiting result' },
            ]}
          />
          <div className="form-grid form-grid--tight">
            <SelectField label="Year" value={form.year} onChange={(e) => set('year', e.target.value)} options={[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => ({ value: String(y), label: String(y) }))} />
            <SelectField
              label="Difficulty"
              value={form.difficulty}
              onChange={(e) => set('difficulty', e.target.value)}
              options={[1, 2, 3, 4, 5].map((d) => ({ value: String(d), label: `${d} / 5` }))}
              error={errors.difficulty}
            />
          </div>
        </div>

        <fieldset className="experience-form__rounds">
          <legend className="field__label">Rounds</legend>
          {form.rounds.map((round, i) => (
            <div key={i} className="experience-form__round">
              <div className="experience-form__round-head">
                <span className="coach-fix__num">{i + 1}</span>
                <TextField
                  label={`Round ${i + 1} name`}
                  className="experience-form__round-name"
                  value={round.name}
                  onChange={(e) => setRound(i, 'name', e.target.value)}
                  error={errors[`rounds.${i}.name`]}
                  placeholder="e.g. Technical interview"
                />
                {form.rounds.length > 1 && (
                  <IconButton icon={Trash2} label={`Remove round ${i + 1}`} className="icon-btn--danger" onClick={() => set('rounds', form.rounds.filter((_, j) => j !== i))} />
                )}
              </div>
              <TextareaField
                label="What happened"
                rows={3}
                maxLength={1500}
                value={round.details}
                onChange={(e) => setRound(i, 'details', e.target.value)}
                error={errors[`rounds.${i}.details`]}
                placeholder="Format, duration, the questions you remember, what they focused on…"
              />
            </div>
          ))}
          {form.rounds.length < 8 && (
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => set('rounds', [...form.rounds, { ...EMPTY_ROUND, name: ROUND_IDEAS[form.rounds.length] || '' }])}
            >
              Add a round
            </Button>
          )}
        </fieldset>

        <TextareaField label="Tips for juniors" rows={3} maxLength={1500} value={form.tips} onChange={(e) => set('tips', e.target.value)} placeholder="What you'd do differently, what to revise, what surprised you" />
        <Switch label="Post anonymously (officers can still see your name)" checked={form.anonymous} onChange={(v) => set('anonymous', v)} />
      </div>
    </Modal>
  );
}
