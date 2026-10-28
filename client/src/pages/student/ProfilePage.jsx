import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Pencil, Save, Sparkles } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Combobox from '../../components/common/Combobox';
import { Switch, TextField } from '../../components/common/Field';
import PlacementStatus from '../../components/student/PlacementStatus';
import ProfileCard from '../../components/student/ProfileCard';
import ResumeUpload from '../../components/student/ResumeUpload';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { updateProfile } from '../../services/profileService';
import { BRANCH_NAMES, jobTypeLabel } from '../../utils/constants';
import { COLLEGES, interestOption, roleLabel } from '../../utils/profileOptions';

const EDIT_PREFERENCES = '/onboarding?edit=1';

// What a complete profile has. Each item links to where it's fixed.
function strengthChecks(user) {
  return [
    { label: 'Resume uploaded', done: Boolean(user.resume), href: '#resume' },
    { label: 'At least 3 skills', done: (user.skills || []).length >= 3, to: EDIT_PREFERENCES },
    { label: 'Roles you want', done: (user.preferredRoles || []).length > 0, to: EDIT_PREFERENCES },
    { label: 'Preferred locations', done: (user.preferredLocations || []).length > 0, to: EDIT_PREFERENCES },
    { label: 'Expected package', done: user.expectedPackage > 0, to: EDIT_PREFERENCES },
    { label: 'Phone number', done: Boolean(user.phone), href: '#contact' },
  ];
}

function ProfileStrength({ user }) {
  const checks = strengthChecks(user);
  const percent = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  return (
    <section className="card profile-strength" aria-labelledby="strength-title">
      <div className="profile-strength__head">
        <h2 id="strength-title" className="card__title">Profile strength</h2>
        <strong>{percent}%</strong>
      </div>
      <div className="profile-strength__bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile strength">
        <span style={{ width: `${percent}%` }} />
      </div>
      <ul className="profile-strength__list">
        {checks.map(({ label, done, to, href }) => {
          const Icon = done ? CheckCircle2 : Circle;
          const text = done ? label : to ? <Link to={to}>{label}</Link> : <a href={href}>{label}</a>;
          return (
            <li key={label} className={done ? 'is-done' : ''}>
              <Icon size={16} aria-hidden="true" />
              {text}
              <span className="sr-only">{done ? '(done)' : '(missing)'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ContactForm({ user, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ college: user.college || '', phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const changed = form.college.trim() !== (user.college || '') || form.phone.trim() !== (user.phone || '');

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.college.trim().length < 2) next.college = 'Enter your college name';
    if (form.phone.trim() && !/^\d{10}$/.test(form.phone.trim())) next.phone = 'Phone must be 10 digits';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      onSaved(await updateProfile({ college: form.college.trim(), phone: form.phone.trim() }));
      toast.success('Contact details saved');
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (!err.fieldErrors || !Object.keys(err.fieldErrors).length) toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={submit} noValidate>
      <Combobox
        label="College"
        required
        options={COLLEGES}
        value={form.college}
        onChange={(college) => setForm((f) => ({ ...f, college }))}
        error={errors.college}
      />
      <TextField
        label="Phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        prefix="+91"
        maxLength={10}
        placeholder="9876543210"
        hint="Recruiters and the placement cell use this to reach you."
        value={form.phone}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
        error={errors.phone}
      />
      <div>
        <Button type="submit" icon={Save} loading={saving} disabled={!changed}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function EmailNotifications({ user, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const enabled = user.emailNotifications !== false;
  const toggle = async (next) => {
    setSaving(true);
    try {
      onSaved(await updateProfile({ emailNotifications: next }));
      toast.success(next ? 'Email notifications on' : 'Email notifications off. You will still see them in the app.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className={`notify-setting ${saving ? 'is-refreshing' : ''}`}>
      <Switch label="Email me too" checked={enabled} onChange={toggle} />
      <p className="field__hint">Stage changes, announcements and new drives that fit you always appear under the bell. This also sends them to {user.email}.</p>
    </div>
  );
}

function PreferenceRow({ label, children, empty }) {
  return (
    <div className="pref-row">
      <dt>{label}</dt>
      <dd>{children || <span className="pref-row__empty">{empty}</span>}</dd>
    </div>
  );
}

const chips = (items, render = (x) => x) =>
  items?.length ? (
    <ul className="mini-chips">
      {items.map((item) => (
        <li key={item}>{render(item)}</li>
      ))}
    </ul>
  ) : null;

export default function ProfilePage() {
  useDocumentTitle('My profile');
  const { user, updateUser } = useAuth();
  const { hash } = useLocation();

  // Links like /student/profile#resume (from the coach and profile strength) jump to that section.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="page">
      <PageHeader
        title="My profile"
        description="What recruiters and the placement cell see, and what your match scores are based on."
      />

      <div className="details-layout">
        <div className="details-main">
          <section className="card" aria-labelledby="academic-title">
            <h2 id="academic-title" className="card__title">Academic details</h2>
            <dl className="detail-grid">
              <div><dt>Name</dt><dd>{user.name}</dd></div>
              <div><dt>Email</dt><dd>{user.email}</dd></div>
              <div><dt>Roll number</dt><dd>{user.rollNumber}</dd></div>
              <div><dt>Branch</dt><dd>{BRANCH_NAMES[user.branch] || user.branch}</dd></div>
              <div><dt>CGPA</dt><dd>{user.cgpa}</dd></div>
              <div><dt>Active backlogs</dt><dd>{user.backlogs ?? 0}</dd></div>
              <div><dt>Graduating</dt><dd>{user.graduationYear}</dd></div>
            </dl>
            <p className="card__note">These decide which drives you're eligible for, so only the placement cell can change them. Spot a mistake? Ask them to fix it.</p>
          </section>

          <section className="card" id="contact" aria-labelledby="contact-title">
            <h2 id="contact-title" className="card__title">Contact</h2>
            <ContactForm user={user} onSaved={updateUser} />
          </section>

          <section className="card" id="notifications" aria-labelledby="notify-title">
            <h2 id="notify-title" className="card__title">Notifications</h2>
            <EmailNotifications user={user} onSaved={updateUser} />
          </section>

          <section className="card" id="resume" aria-labelledby="resume-title">
            <h2 id="resume-title" className="card__title">Resume</h2>
            <p className="card__note">
              Officers open this when they shortlist. PDF or JPG, under 2 MB. No resume yet, or want a cleaner one?{' '}
              <Link to="/student/resume-builder">Build it here</Link>.
            </p>
            <ResumeUpload resume={user.resume} onChange={updateUser} />
            {user.resume && (
              <Link to="/student/coach" className="coach-link">
                <Sparkles size={18} aria-hidden="true" />
                <span>
                  <strong>Get AI feedback on this resume</strong>
                  <small>A score, rewritten lines and skills to add to your profile</small>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )}
          </section>

          <section className="card" aria-labelledby="prefs-title">
            <div className="card__header card__header--split">
              <h2 id="prefs-title" className="card__title">Career preferences</h2>
              <Button as={Link} to={EDIT_PREFERENCES} variant="secondary" size="sm" icon={Pencil}>
                Edit
              </Button>
            </div>
            <dl className="pref-list">
              <PreferenceRow label="Skills" empty="No skills yet">{chips(user.skills)}</PreferenceRow>
              <PreferenceRow label="Roles" empty="No roles picked">{chips(user.preferredRoles, roleLabel)}</PreferenceRow>
              <PreferenceRow label="Interests" empty="No interests picked">
                {chips(user.interests, (key) => interestOption(key)?.label || key)}
              </PreferenceRow>
              <PreferenceRow label="Locations" empty="Anywhere">{chips(user.preferredLocations)}</PreferenceRow>
              <PreferenceRow label="Job type" empty="Any">{user.jobTypes?.length ? user.jobTypes.map(jobTypeLabel).join(' / ') : null}</PreferenceRow>
              <PreferenceRow label="Expected package" empty="Not set">{user.expectedPackage ? `₹${user.expectedPackage}+ LPA` : null}</PreferenceRow>
            </dl>
          </section>
        </div>

        <aside className="details-aside profile-aside">
          <ProfileCard user={user} />
          <PlacementStatus />
          <ProfileStrength user={user} />
        </aside>
      </div>
    </div>
  );
}
