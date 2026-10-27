import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button';
import { PasswordField, TextField } from '../../components/common/Field';
import { InlineAlert } from '../../components/common/States';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function AdminLoginPage() {
  useDocumentTitle('Officer login');
  const { login, logout } = useAuth();
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
      if (user.role !== 'admin') {
        logout();
        setFormError('This account is not a placement officer account. Students log in on the student page.');
        setSubmitting(false);
        return;
      }
      const from = location.state?.from?.pathname;
      navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setFormError(error.code === 'VALIDATION_ERROR' ? '' : error.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout variant="admin">
      <div className="auth-card">
        <div className="auth-card__head">
          <p className="eyebrow">
            <ShieldCheck size={14} aria-hidden="true" /> Officer portal
          </p>
          <h2 className="auth-card__title">Placement cell login</h2>
          <p className="muted">Manage drives, applicants and placement stats.</p>
        </div>

        {formError && <InlineAlert>{formError}</InlineAlert>}

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Officer email"
            type="email"
            autoComplete="email"
            placeholder="officer@college.edu"
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
            Log in to portal
          </Button>
        </form>

        <p className="auth-card__alt">
          Student? <Link to="/login">Go to student login</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
