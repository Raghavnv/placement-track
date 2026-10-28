import { useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { Save } from 'lucide-react';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import { Segmented, SelectField, TextareaField, TextField } from '../common/Field';
import TagInput from '../common/TagInput';
import { InlineAlert } from '../common/States';
import DriveCard from '../student/DriveCard';
import { BRANCHES, BRANCH_NAMES, GRADUATION_YEARS, JOB_TYPES } from '../../utils/constants';
import { toLocalInputValue } from '../../utils/format';
import useAsync from '../../hooks/useAsync';
import { getPolicy, tierOf, TIER_LABELS } from '../../services/placementService';

const toForm = (drive) => ({
  companyName: drive?.companyName || '',
  role: drive?.role || '',
  description: drive?.description || '',
  package: drive?.package ?? '',
  location: drive?.location || '',
  jobType: drive?.jobType || 'full-time',
  skills: drive?.skills || [],
  minCgpa: drive?.eligibility?.minCgpa ?? '6',
  maxBacklogs: drive?.eligibility?.maxBacklogs ?? '0',
  graduationYear: drive?.eligibility?.graduationYear ? String(drive.eligibility.graduationYear) : '',
  branches: drive?.eligibility?.branches || [],
  deadline: toLocalInputValue(drive?.deadline),
  driveDate: toLocalInputValue(drive?.driveDate),
  status: drive?.status || 'open',
});

function validate(form, isEdit) {
  const errors = {};
  if (form.companyName.trim().length < 2) errors.companyName = 'Enter the company name';
  if (form.role.trim().length < 2) errors.role = 'Enter the job role';
  const pkg = Number(form.package);
  if (form.package === '' || Number.isNaN(pkg) || pkg <= 0) errors.package = 'Enter a package greater than 0';
  else if (pkg > 200) errors.package = 'That looks too high (max 200 LPA)';
  const cgpa = Number(form.minCgpa);
  if (form.minCgpa === '' || Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10) errors.minCgpa = 'Between 0 and 10';
  const backlogs = Number(form.maxBacklogs);
  if (!Number.isInteger(backlogs) || backlogs < 0) errors.maxBacklogs = '0 or more';
  if (!form.deadline) errors.deadline = 'Choose a deadline';
  else if (!isEdit && new Date(form.deadline) <= new Date()) errors.deadline = 'Deadline must be in the future';
  if (form.driveDate && form.deadline && new Date(form.driveDate) < new Date(form.deadline)) {
    errors.driveDate = 'Drive date must be on or after the deadline';
  }
  return errors;
}

function toPayload(form, isEdit) {
  const payload = {
    companyName: form.companyName.trim(),
    role: form.role.trim(),
    description: form.description.trim(),
    package: Number(form.package),
    location: form.location.trim(),
    jobType: form.jobType,
    skills: form.skills,
    eligibility: {
      minCgpa: Number(form.minCgpa),
      maxBacklogs: Number(form.maxBacklogs),
      graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
      branches: form.branches,
    },
    deadline: new Date(form.deadline).toISOString(),
    driveDate: form.driveDate ? new Date(form.driveDate).toISOString() : null,
  };
  if (isEdit) payload.status = form.status;
  return payload;
}

// Server error fields like "eligibility.minCgpa" map onto flat form fields.
const flattenServerErrors = (fieldErrors = {}) =>
  Object.fromEntries(Object.entries(fieldErrors).map(([key, msg]) => [key.replace('eligibility.', ''), msg]));

export default function DriveForm({ drive, onSubmit, submitLabel }) {
  const isEdit = Boolean(drive);
  const initial = useMemo(() => toForm(drive), [drive]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  const { data: policyData } = useAsync(getPolicy, []);
  const tier = policyData && form.jobType === 'full-time' && Number(form.package) > 0 ? tierOf(Number(form.package), policyData.policy) : null;
  const [submitting, setSubmitting] = useState(false);
  const allowLeave = useRef(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
  );

  const set = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field] || errors[field]) setErrors((e) => ({ ...e, [field]: validate(next, isEdit)[field] }));
  };
  const bind = (field) => ({
    value: form[field],
    onChange: (e) => set(field, e.target.value),
    onBlur: () => {
      setTouched((t) => ({ ...t, [field]: true }));
      setErrors((e) => ({ ...e, [field]: validate(form, isEdit)[field] }));
    },
    error: errors[field],
  });

  const toggleBranch = (branch) =>
    set('branches', form.branches.includes(branch) ? form.branches.filter((b) => b !== branch) : [...form.branches, branch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form, isEdit);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setFormError('Please fix the highlighted fields.');
      requestAnimationFrame(() => document.querySelector('.drive-form [aria-invalid="true"]')?.focus());
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      allowLeave.current = true;
      await onSubmit(toPayload(form, isEdit));
    } catch (error) {
      allowLeave.current = false;
      setErrors(flattenServerErrors(error.fieldErrors));
      setFormError(error.message);
      setSubmitting(false);
    }
  };

  const preview = {
    _id: 'preview',
    companyName: form.companyName || 'Company name',
    role: form.role || 'Job role',
    package: Number(form.package) || 0,
    tier,
    location: form.location,
    jobType: form.jobType,
    applicantCount: drive?.applicantCount || 0,
    deadline: form.deadline ? new Date(form.deadline).toISOString() : new Date(Date.now() + 7 * 864e5).toISOString(),
    isEligible: true,
    hasApplied: false,
    matchScore: 82,
    matchReasons: form.skills.length ? [`Looks for ${form.skills.slice(0, 3).join(', ')}`] : [],
  };

  return (
    <form className="drive-form" onSubmit={handleSubmit} noValidate>
      <div className="drive-form__main">
        {formError && <InlineAlert>{formError}</InlineAlert>}

        <fieldset className="card form-section">
          <legend className="form-section__title">Company & role</legend>
          <div className="form-grid">
            <TextField label="Company name" required placeholder="Infosys" {...bind('companyName')} />
            <TextField label="Job role" required placeholder="Systems Engineer" {...bind('role')} />
            <TextareaField
              className="form-grid__full"
              label="Description"
              rows={4}
              maxLength={2000}
              placeholder="Selection process, training, bond, anything students should know."
              {...bind('description')}
            />
            <div className="form-grid__full">
              <TagInput
                label="Skills the company is looking for"
                value={form.skills}
                onChange={(value) => set('skills', value)}
                max={15}
                suggestions={['Java', 'Python', 'C++', 'SQL', 'DSA', 'React', 'Node.js', 'AWS', 'Machine Learning', 'Excel', 'Power BI', 'Communication', 'Aptitude', 'AutoCAD', 'MATLAB', 'Embedded C']}
                placeholder="Used to compute student match scores"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="card form-section">
          <legend className="form-section__title">Compensation & location</legend>
          <div className="form-grid">
            <TextField
              label="Package"
              required
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="6.5"
              prefix="₹"
              suffix="LPA"
              hint={tier ? `${TIER_LABELS[tier]} tier under your placement policy` : undefined}
              {...bind('package')}
            />
            <TextField label="Location" placeholder="Bengaluru" {...bind('location')} />
            <div className="field form-grid__full">
              <span className="field__label">Job type</span>
              <Segmented label="Job type" name="jobType" value={form.jobType} onChange={(v) => set('jobType', v)} options={JOB_TYPES} />
            </div>
          </div>
        </fieldset>

        <fieldset className="card form-section">
          <legend className="form-section__title">Eligibility</legend>
          <div className="form-grid form-grid--3">
            <TextField label="Minimum CGPA" required type="number" inputMode="decimal" step="0.1" min="0" max="10" {...bind('minCgpa')} />
            <TextField label="Max backlogs" type="number" inputMode="numeric" step="1" min="0" {...bind('maxBacklogs')} />
            <SelectField
              label="Graduation year"
              placeholder="Any year"
              options={GRADUATION_YEARS.map((y) => ({ value: String(y), label: String(y) }))}
              {...bind('graduationYear')}
            />
          </div>
          <div className="field">
            <div className="field__label-row">
              <span className="field__label" id="branches-label">Branches</span>
              <span className="field__hint">{form.branches.length ? `${form.branches.length} selected` : 'Open to all branches'}</span>
            </div>
            <div className="chip-select" role="group" aria-labelledby="branches-label">
              <button
                type="button"
                className={`chip-toggle ${form.branches.length === 0 ? 'is-on' : ''}`}
                aria-pressed={form.branches.length === 0}
                onClick={() => set('branches', [])}
              >
                All branches
              </button>
              {BRANCHES.map((branch) => (
                <button
                  key={branch}
                  type="button"
                  title={BRANCH_NAMES[branch]}
                  className={`chip-toggle ${form.branches.includes(branch) ? 'is-on' : ''}`}
                  aria-pressed={form.branches.includes(branch)}
                  onClick={() => toggleBranch(branch)}
                >
                  {branch}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="card form-section">
          <legend className="form-section__title">Dates</legend>
          <div className="form-grid">
            <TextField label="Application deadline" required type="datetime-local" {...bind('deadline')} />
            <TextField label="Drive date" type="datetime-local" hint="Aptitude test or interview day (optional)" {...bind('driveDate')} />
          </div>
          {isEdit && (
            <div className="field">
              <span className="field__label">Status</span>
              <Segmented
                label="Status"
                name="status"
                value={form.status}
                onChange={(v) => set('status', v)}
                options={[
                  { value: 'open', label: 'Open for applications' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
            </div>
          )}
        </fieldset>

        <div className="form-actions">
          <Button type="submit" size="lg" icon={Save} loading={submitting}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <aside className="drive-form__preview" aria-label="Student preview">
        <p className="eyebrow">Student preview</p>
        <div className="preview-frame" inert="">
          <DriveCard drive={preview} to="#" />
        </div>
        <p className="muted preview-note">This is how the drive appears to eligible students.</p>
      </aside>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title="Leave without saving?"
        description="Your changes to this drive will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        tone="danger"
      />
    </form>
  );
}
