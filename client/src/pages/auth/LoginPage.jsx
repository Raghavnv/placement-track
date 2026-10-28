import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import { PasswordField, TextField } from '../../components/common/Field';
import { InlineAlert } from '../../components/common/States';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { homePathFor } from '../../utils/constants';

export default function LoginPage() {
  useDocumentTitle('Log in');
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Enter your email';
    if (!form.password) nextErrors.password = 'Enter your password';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await login(form.email.trim(), form.password);
      const from = location.state?.from?.pathname;
      const home = homePathFor(user);
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setFormError(error.code === 'VALIDATION_ERROR' ? '' : error.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout variant="student">
      <div className="auth-card">
        <div className="auth-card__head">
          <h2 className="auth-card__title">
            Welcome <mark>back.</mark>
          </h2>
          <p className="muted">Pick up right where you left off.</p>
        </div>

        {sessionExpired && !formError && (
          <InlineAlert tone="warning" icon={Clock}>
            Your session expired. Please log in again.
          </InlineAlert>
        )}
        {formError && <InlineAlert>{formError}</InlineAlert>}

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          <TextField
            label="College email"
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            value={form.email}
            onChange={update('email')}
            error={errors.email}
            autoFocus
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
          />
          <Button type="submit" block size="lg" loading={submitting} iconRight={ArrowRight}>
            Log in
          </Button>
        </form>

        <p className="auth-card__switch">
          New here? <Link to="/register">Create a student account</Link>
        </p>
        <p className="auth-card__alt">
          Placement officer? <Link to="/admin/login">Go to the officer portal</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
