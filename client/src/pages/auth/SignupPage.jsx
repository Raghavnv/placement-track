import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import Combobox from '../../components/common/Combobox';
import { PasswordField, SelectField, TextField } from '../../components/common/Field';
import { InlineAlert } from '../../components/common/States';
import OnboardingSteps from '../../components/student/OnboardingSteps';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { BRANCHES, BRANCH_NAMES, DEFAULT_GRADUATION_YEAR, GRADUATION_YEARS } from '../../utils/constants';
import { COLLEGES } from '../../utils/profileOptions';
import { firstName } from '../../utils/format';

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: '8+ characters' },
  { test: (p) => /[A-Za-z]/.test(p), label: 'a letter' },
  { test: (p) => /\d/.test(p), label: 'a number' },
];

const INITIAL = {
  name: '',
  college: '',
  email: '',
  password: '',
  rollNumber: '',
  branch: '',
  cgpa: '',
  backlogs: '0',
  graduationYear: String(DEFAULT_GRADUATION_YEAR),
  phone: '',
};

const STEP_FIELDS = {
  account: ['name', 'college', 'email', 'password'],
  academics: ['rollNumber', 'branch', 'cgpa', 'backlogs', 'graduationYear', 'phone'],
};

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Enter your full name';
  if (form.college.trim().length < 2) errors.college = 'Tell us your college';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email';
  if (!PASSWORD_RULES.every((rule) => rule.test(form.password))) errors.password = 'Use 8+ characters with a letter and a number';
  if (form.rollNumber.trim().length < 3) errors.rollNumber = 'Enter your roll number';
  if (!form.branch) errors.branch = 'Choose your branch';
  const cgpa = Number(form.cgpa);
  if (form.cgpa === '' || Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10) errors.cgpa = 'CGPA must be between 0 and 10';
  const backlogs = Number(form.backlogs);
  if (!Number.isInteger(backlogs) || backlogs < 0) errors.backlogs = 'Enter 0 or more';
  if (form.phone && !/^\d{10}$/.test(form.phone)) errors.phone = 'Phone must be 10 digits';
  return errors;
}

const pick = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => keys.includes(k)));

export default function SignupPage() {
  const [step, setStep] = useState('account');
  useDocumentTitle(step === 'account' ? 'Create account' : 'Your academics');
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setValue = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) setErrors((errs) => ({ ...errs, [field]: validate(next)[field] }));
  };
  const blur = (field) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((errs) => ({ ...errs, [field]: validate(form)[field] }));
  };
  const bind = (field) => ({ value: form[field], onChange: (e) => setValue(field, e.target.value), onBlur: blur(field), error: errors[field] });

  const checkStep = (name) => {
    const stepErrors = pick(validate(form), STEP_FIELDS[name]);
    setErrors((errs) => ({ ...pick(errs, Object.keys(errs).filter((k) => !STEP_FIELDS[name].includes(k))), ...stepErrors }));
    setTouched((t) => ({ ...t, ...Object.fromEntries(STEP_FIELDS[name].map((k) => [k, true])) }));
    if (Object.keys(stepErrors).length) {
      requestAnimationFrame(() => document.querySelector('.auth-card [aria-invalid="true"]')?.focus());
      return false;
    }
    return true;
  };

  const goToAcademics = (e) => {
    e.preventDefault();
    if (!checkStep('account')) return;
    setFormError('');
    setStep('academics');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkStep('academics')) return;
    setSubmitting(true);
    setFormError('');
    try {
      await register({
        ...form,
        name: form.name.trim(),
        college: form.college.trim(),
        email: form.email.trim(),
        rollNumber: form.rollNumber.trim(),
        cgpa: Number(form.cgpa),
        backlogs: Number(form.backlogs),
        graduationYear: Number(form.graduationYear),
        phone: form.phone || undefined,
      });
      navigate('/onboarding', { replace: true });
    } catch (error) {
      const fieldErrors = error.fieldErrors || {};
      setErrors(fieldErrors);
      setFormError(error.message);
      setSubmitting(false);
      // Email/college problems live on the first screen.
      if (Object.keys(fieldErrors).some((f) => STEP_FIELDS.account.includes(f))) setStep('account');
    }
  };

  return (
    <AuthLayout variant="student">
      <div className="auth-card">
        <OnboardingSteps current={step} />

        {step === 'account' ? (
          <>
            <div className="auth-card__head">
              <h2 className="auth-card__title">
                Let's get you <mark>placed.</mark>
              </h2>
              <p className="muted">Takes two minutes. Your answers decide which drives we put in front of you.</p>
            </div>
            {formError && <InlineAlert>{formError}</InlineAlert>}
            <form className="form-stack" onSubmit={goToAcademics} noValidate>
              <TextField label="Full name" autoComplete="name" placeholder="Asha Rao" required {...bind('name')} autoFocus />
              <Combobox
                label="Which college are you studying in?"
                required
                placeholder="Start typing your college"
                hint="Not in the list? Just type it."
                options={COLLEGES}
                value={form.college}
                onChange={(value) => setValue('college', value)}
                onBlur={blur('college')}
                error={errors.college}
              />
              <TextField label="College email" type="email" autoComplete="email" placeholder="you@college.edu" required {...bind('email')} />
              <div>
                <PasswordField label="Password" autoComplete="new-password" required {...bind('password')} />
                <ul className="password-rules" aria-label="Password requirements">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(form.password);
                    return (
                      <li key={rule.label} className={ok ? 'is-ok' : ''}>
                        {ok ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}
                        {rule.label}
                        <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <Button type="submit" block size="lg" iconRight={ArrowRight}>
                Continue
              </Button>
            </form>
            <p className="auth-card__switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </>
        ) : (
          <>
            <div className="auth-card__head">
              <h2 className="auth-card__title">
                Nice to meet you, <mark>{firstName(form.name) || 'there'}.</mark>
              </h2>
              <p className="muted">Companies set cut-offs on these, so we use them to check your eligibility for each drive.</p>
            </div>
            {formError && <InlineAlert>{formError}</InlineAlert>}
            <form className="form-stack" onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                <TextField label="Roll number" placeholder="21CS045" required {...bind('rollNumber')} autoFocus />
                <SelectField
                  label="Branch"
                  required
                  placeholder="Choose branch"
                  options={BRANCHES.map((b) => ({ value: b, label: `${b} · ${BRANCH_NAMES[b]}` }))}
                  {...bind('branch')}
                />
                <TextField label="CGPA" type="number" inputMode="decimal" step="0.01" min="0" max="10" placeholder="8.4" required {...bind('cgpa')} />
                <TextField label="Active backlogs" type="number" inputMode="numeric" min="0" step="1" {...bind('backlogs')} />
                <SelectField
                  label="Graduating in"
                  required
                  options={GRADUATION_YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                  {...bind('graduationYear')}
                />
                <TextField label="Phone (optional)" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10 digits" {...bind('phone')} />
              </div>
              <div className="form-actions form-actions--split">
                <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep('account')} disabled={submitting}>
                  Back
                </Button>
                <Button type="submit" size="lg" loading={submitting} iconRight={ArrowRight}>
                  Create account
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
