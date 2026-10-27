import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import { PasswordField, SelectField, TextField } from '../../components/common/Field';
import { InlineAlert } from '../../components/common/States';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { BRANCHES, BRANCH_NAMES, GRADUATION_YEARS } from '../../utils/constants';
import { firstName } from '../../utils/format';

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[A-Za-z]/.test(p), label: 'Contains a letter' },
  { test: (p) => /\d/.test(p), label: 'Contains a number' },
];

const INITIAL = {
  name: '',
  email: '',
  password: '',
  rollNumber: '',
  branch: '',
  cgpa: '',
  backlogs: '0',
  graduationYear: String(GRADUATION_YEARS[1]),
  phone: '',
};

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Enter your full name';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email';
  if (!PASSWORD_RULES.every((rule) => rule.test(form.password))) errors.password = 'Password does not meet the rules below';
  if (form.rollNumber.trim().length < 3) errors.rollNumber = 'Enter your roll number';
  if (!form.branch) errors.branch = 'Choose your branch';
  const cgpa = Number(form.cgpa);
  if (form.cgpa === '' || Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10) errors.cgpa = 'CGPA must be between 0 and 10';
  const backlogs = Number(form.backlogs);
  if (!Number.isInteger(backlogs) || backlogs < 0) errors.backlogs = 'Enter 0 or more';
  if (form.phone && !/^\d{10}$/.test(form.phone)) errors.phone = 'Phone must be 10 digits';
  return errors;
}

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    const next = { ...form, [field]: e.target.value };
    setForm(next);
    if (touched[field]) setErrors((errs) => ({ ...errs, [field]: validate(next)[field] }));
  };
  const blur = (field) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((errs) => ({ ...errs, [field]: validate(form)[field] }));
  };
  const fieldProps = (field) => ({ value: form[field], onChange: update(field), onBlur: blur(field), error: errors[field] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setTouched(Object.fromEntries(Object.keys(INITIAL).map((k) => [k, true])));
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await register({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        rollNumber: form.rollNumber.trim(),
        cgpa: Number(form.cgpa),
        backlogs: Number(form.backlogs),
        graduationYear: Number(form.graduationYear),
        phone: form.phone || undefined,
      });
      toast.success(`Welcome aboard, ${firstName(user.name)}!`);
      navigate('/student', { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setFormError(error.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout variant="student">
      <div className="auth-card auth-card--wide">
        <div className="auth-card__head">
          <h2 className="auth-card__title">Create your student account</h2>
          <p className="muted">Your academic details decide which drives you're eligible for.</p>
        </div>

        {formError && <InlineAlert>{formError}</InlineAlert>}

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          <fieldset className="form-section">
            <legend className="form-section__title">Account</legend>
            <div className="form-grid">
              <TextField label="Full name" autoComplete="name" required {...fieldProps('name')} />
              <TextField label="College email" type="email" autoComplete="email" required {...fieldProps('email')} />
              <div className="form-grid__full">
                <PasswordField label="Password" autoComplete="new-password" required {...fieldProps('password')} />
                <ul className="password-rules" aria-label="Password requirements">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(form.password);
                    return (
                      <li key={rule.label} className={ok ? 'is-ok' : ''}>
                        {ok ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                        {rule.label}
                        <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend className="form-section__title">Academic profile</legend>
            <div className="form-grid">
              <TextField label="Roll number" placeholder="21CS045" required {...fieldProps('rollNumber')} />
              <SelectField
                label="Branch"
                required
                placeholder="Choose branch"
                options={BRANCHES.map((b) => ({ value: b, label: `${b} · ${BRANCH_NAMES[b]}` }))}
                {...fieldProps('branch')}
              />
              <TextField label="CGPA" type="number" inputMode="decimal" step="0.01" min="0" max="10" placeholder="8.4" required {...fieldProps('cgpa')} />
              <TextField label="Active backlogs" type="number" inputMode="numeric" min="0" step="1" {...fieldProps('backlogs')} />
              <SelectField
                label="Graduation year"
                required
                options={GRADUATION_YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                {...fieldProps('graduationYear')}
              />
              <TextField label="Phone (optional)" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10 digits" {...fieldProps('phone')} />
            </div>
          </fieldset>

          <Button type="submit" block size="lg" loading={submitting} iconRight={ArrowRight}>
            Create account
          </Button>
        </form>

        <p className="auth-card__switch">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
