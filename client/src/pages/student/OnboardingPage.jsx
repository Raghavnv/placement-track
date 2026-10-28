import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, GraduationCap, Sparkles } from 'lucide-react';
import Logo from '../../components/common/Logo';
import Button from '../../components/common/Button';
import TagInput from '../../components/common/TagInput';
import OptionTile from '../../components/common/OptionTile';
import { InlineAlert } from '../../components/common/States';
import ThemeToggle from '../../components/layout/ThemeToggle';
import OnboardingSteps from '../../components/student/OnboardingSteps';
import ProfileCard from '../../components/student/ProfileCard';
import ResumeUpload from '../../components/student/ResumeUpload';
import MatchResults from '../../components/student/MatchResults';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { updateProfile } from '../../services/profileService';
import { listDrives } from '../../services/driveService';
import { INTEREST_OPTIONS, LOCATION_OPTIONS, ROLE_OPTIONS, skillSuggestions } from '../../utils/profileOptions';
import { firstName } from '../../utils/format';

const STEPS = ['skills', 'resume', 'interests', 'roles', 'preferences'];
const MAX_ROLES = 5;

const QUESTIONS = {
  skills: {
    eyebrow: 'Your toolkit',
    title: ['What are you', 'good at?'],
    lead: 'Pick the languages, tools and subjects you can talk about in an interview. Add your own too.',
  },
  resume: {
    eyebrow: 'Your first impression',
    title: ['Upload your', 'resume.'],
    lead: 'It’s the first thing recruiters ask for. Add a PDF or a clear JPG scan; you can replace it any time.',
  },
  interests: {
    eyebrow: 'What excites you',
    title: ['Which areas do you', 'want to work in?'],
    lead: 'Choose as many as you like. We use these to spot drives you might otherwise scroll past.',
  },
  roles: {
    eyebrow: 'Your goal',
    title: ['Which roles are you', 'looking for?'],
    lead: `Pick up to ${MAX_ROLES}. Roles that fit these get a big boost in your match scores.`,
  },
  preferences: {
    eyebrow: 'Almost there',
    title: ['Where and how do', 'you want to work?'],
    lead: 'All optional. Leave anything blank and we won’t filter on it.',
  },
};

const fromUser = (user) => ({
  skills: user.skills || [],
  interests: user.interests || [],
  preferredRoles: user.preferredRoles || [],
  preferredLocations: user.preferredLocations || [],
  jobTypes: user.jobTypes || [],
  expectedPackage: user.expectedPackage || 0,
});

const toggle = (list, key) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

export default function OnboardingPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = !user.needsOnboarding || params.get('edit') === '1';
  const [step, setStep] = useState('skills');
  const [draft, setDraft] = useState(() => fromUser(user));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState('questions');
  const [matches, setMatches] = useState({ drives: null, error: null });
  useDocumentTitle(phase === 'questions' ? 'Set up your profile' : 'Your matches');

  const index = STEPS.indexOf(step);
  const set = (field, value) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setError('');
  };

  const stepError = () => {
    if (step === 'skills' && draft.skills.length === 0) return 'Add at least one skill. Tap a suggestion to start.';
    if (step === 'resume' && !user.resume) return 'Upload your resume to continue, or use “Skip for now” and add it later.';
    if (step === 'interests' && draft.interests.length === 0) return 'Pick at least one area.';
    if (step === 'roles' && draft.preferredRoles.length === 0) return 'Pick at least one role.';
    return '';
  };

  const finish = async (payload) => {
    setSaving(true);
    try {
      const updated = await updateProfile(payload);
      updateUser(updated);
      setPhase('matching');
      listDrives({ sort: 'match', limit: 50 })
        .then((res) => setMatches({ drives: res.data, error: null }))
        .catch((err) => setMatches({ drives: [], error: err }));
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    const message = stepError();
    if (message) {
      setError(message);
      return;
    }
    if (index < STEPS.length - 1) {
      setStep(STEPS[index + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    finish({
      ...draft,
      expectedPackage: draft.expectedPackage || null,
      needsOnboarding: false,
    });
  };

  const back = () => (index > 0 ? setStep(STEPS[index - 1]) : null);

  const skip = async () => {
    if (editing) {
      navigate('/student');
      return;
    }
    setSaving(true);
    try {
      updateUser(await updateProfile({ needsOnboarding: false }));
      navigate('/student', { replace: true });
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  // Enter = continue (except while typing a skill, where Enter adds the tag).
  useEffect(() => {
    if (phase !== 'questions') return undefined;
    const onKey = (event) => {
      if (event.key !== 'Enter' || event.target.closest('.tag-input, button, a')) return;
      event.preventDefault();
      next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (phase !== 'questions') {
    return (
      <div className="onboarding onboarding--result">
        <header className="onboarding__bar">
          <Logo />
          <ThemeToggle />
        </header>
        <main id="main" className="onboarding__result-main">
          <MatchResults user={user} drives={matches.drives} error={matches.error} />
        </main>
      </div>
    );
  }

  const question = QUESTIONS[step];

  return (
    <div className="onboarding">
      <header className="onboarding__bar">
        <Logo />
        <div className="onboarding__bar-steps">
          <OnboardingSteps current={step} />
        </div>
        <div className="onboarding__bar-actions">
          <ThemeToggle />
          <button type="button" className="text-link" onClick={skip} disabled={saving}>
            {editing ? 'Cancel' : 'Skip for now'}
          </button>
        </div>
      </header>

      <main id="main" className="onboarding__main">
        <section className="onboarding__question" key={step}>
          <p className="eyebrow">
            {step === 'skills' && !editing ? (
              <>
                <Sparkles size={14} aria-hidden="true" /> Welcome, {firstName(user.name)}
              </>
            ) : (
              question.eyebrow
            )}
          </p>
          <h1 className="onboarding__title">
            {question.title[0]} <mark>{question.title[1]}</mark>
          </h1>
          <p className="onboarding__lead">{question.lead}</p>

          <div className="onboarding__answers">
            {step === 'skills' && (
              <TagInput
                label="Your skills"
                value={draft.skills}
                onChange={(value) => set('skills', value)}
                suggestions={skillSuggestions(user.branch)}
                placeholder="e.g. Python, React, AutoCAD…"
              />
            )}

            {step === 'resume' && (
              <ResumeUpload
                resume={user.resume}
                onChange={(updated) => {
                  updateUser(updated);
                  setError('');
                }}
              />
            )}

            {step === 'interests' && (
              <div className="tile-grid">
                {INTEREST_OPTIONS.map((option) => (
                  <OptionTile
                    key={option.key}
                    emoji={option.emoji}
                    title={option.label}
                    selected={draft.interests.includes(option.key)}
                    onToggle={() => set('interests', toggle(draft.interests, option.key))}
                  />
                ))}
              </div>
            )}

            {step === 'roles' && (
              <div className="tile-grid tile-grid--roles">
                {ROLE_OPTIONS.map((option) => (
                  <OptionTile
                    key={option.key}
                    icon={option.icon}
                    title={option.label}
                    hint={option.hint}
                    selected={draft.preferredRoles.includes(option.key)}
                    disabled={draft.preferredRoles.length >= MAX_ROLES}
                    onToggle={() => set('preferredRoles', toggle(draft.preferredRoles, option.key))}
                  />
                ))}
              </div>
            )}

            {step === 'preferences' && (
              <div className="pref-stack">
                <fieldset className="pref-group">
                  <legend>What kind of offer?</legend>
                  <div className="tile-grid tile-grid--2">
                    <OptionTile
                      icon={Briefcase}
                      title="Full-time job"
                      hint="Graduate roles after your degree"
                      selected={draft.jobTypes.includes('full-time')}
                      onToggle={() => set('jobTypes', toggle(draft.jobTypes, 'full-time'))}
                    />
                    <OptionTile
                      icon={GraduationCap}
                      title="Internship"
                      hint="Summer or semester-long"
                      selected={draft.jobTypes.includes('internship')}
                      onToggle={() => set('jobTypes', toggle(draft.jobTypes, 'internship'))}
                    />
                  </div>
                </fieldset>

                <fieldset className="pref-group">
                  <legend>Where would you like to work?</legend>
                  <div className="chip-select">
                    {LOCATION_OPTIONS.map((city) => (
                      <button
                        key={city}
                        type="button"
                        className={`chip-toggle ${draft.preferredLocations.includes(city) ? 'is-on' : ''}`}
                        aria-pressed={draft.preferredLocations.includes(city)}
                        onClick={() => set('preferredLocations', toggle(draft.preferredLocations, city))}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="pref-group">
                  <legend>Minimum package you're aiming for</legend>
                  <div className="range">
                    <output className="range__value" htmlFor="package-range">
                      {draft.expectedPackage ? (
                        <>
                          ₹{draft.expectedPackage}
                          <small> LPA +</small>
                        </>
                      ) : (
                        'No minimum'
                      )}
                    </output>
                    <input
                      id="package-range"
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={draft.expectedPackage}
                      onChange={(e) => set('expectedPackage', Number(e.target.value))}
                      aria-label="Minimum package in lakhs per annum"
                      style={{ '--fill': `${(draft.expectedPackage / 30) * 100}%` }}
                    />
                    <div className="range__scale" aria-hidden="true">
                      <span>Any</span>
                      <span>₹10L</span>
                      <span>₹20L</span>
                      <span>₹30L</span>
                    </div>
                  </div>
                </fieldset>
              </div>
            )}
          </div>

          {error && <InlineAlert tone="warning">{error}</InlineAlert>}

          <div className="onboarding__nav">
            {index > 0 ? (
              <Button variant="ghost" icon={ArrowLeft} onClick={back} disabled={saving}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button size="lg" iconRight={ArrowRight} onClick={next} loading={saving}>
              {index === STEPS.length - 1 ? 'Show my matches' : 'Continue'}
            </Button>
          </div>
          <p className="onboarding__hint" aria-hidden="true">
            Press <kbd>Enter</kbd> to continue
          </p>
        </section>

        <aside className="onboarding__preview" aria-label="Live preview of your profile">
          <ProfileCard user={user} draft={draft} tilt />
          <p className="onboarding__preview-note">This card is what we match against. You can edit it any time from your dashboard.</p>
        </aside>
      </main>

      {editing && (
        <p className="sr-only">
          <Link to="/student">Back to dashboard</Link>
        </p>
      )}
    </div>
  );
}
