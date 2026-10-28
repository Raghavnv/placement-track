import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, RotateCw, Sparkles, UserPlus } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/States';
import { CopyButton } from '../../components/student/FitCheckButton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { getReview, runReview } from '../../services/coachService';
import { updateProfile } from '../../services/profileService';
import { timeAgo } from '../../utils/format';

const SCORE_LABELS = { impact: 'Impact', clarity: 'Clarity', structure: 'Structure', ats: 'ATS-friendly' };
const RESUME_ERRORS = ['NO_RESUME', 'RESUME_NOT_PDF', 'RESUME_UNREADABLE'];
const tone = (score) => (score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low');

function ScoreCard({ review }) {
  return (
    <section className="card coach-hero" aria-labelledby="score-title">
      <div className="coach-hero__score">
        <h2 id="score-title" className="sr-only">Resume score</h2>
        <p className={`coach-score coach-score--lg coach-score--${tone(review.overallScore)}`}>
          <strong>{review.overallScore}</strong>
          <span>/100</span>
        </p>
        <p className="coach-hero__verdict">{review.verdict}</p>
      </div>
      <ul className="coach-bars">
        {Object.entries(SCORE_LABELS).map(([key, label]) => (
          <li key={key}>
            <span className="coach-bars__label">{label}</span>
            <span className="coach-bars__track" role="progressbar" aria-label={label} aria-valuenow={review.scores[key]} aria-valuemin={0} aria-valuemax={100}>
              <span className={`coach-bars__fill coach-bars__fill--${tone(review.scores[key])}`} style={{ width: `${review.scores[key]}%` }} />
            </span>
            <span className="coach-bars__value">{review.scores[key]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Skills the resume proves that the profile doesn't list: one tap adds them and match scores update.
function SkillSync({ newSkills, onAdded }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [picked, setPicked] = useState(() => new Set(newSkills));
  const [saving, setSaving] = useState(false);

  useEffect(() => setPicked(new Set(newSkills)), [newSkills]);
  if (!newSkills.length) return null;

  const toggle = (skill) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });

  const add = async () => {
    setSaving(true);
    try {
      const added = newSkills.filter((s) => picked.has(s));
      updateUser(await updateProfile({ skills: [...(user.skills || []), ...added] }));
      onAdded(added);
      toast.success(`Added ${added.length} skill${added.length === 1 ? '' : 's'}. Your match scores are updated.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card coach-sync" aria-labelledby="sync-title">
      <div>
        <h2 id="sync-title" className="card__title">
          <UserPlus size={18} aria-hidden="true" /> Your resume shows skills your profile is missing
        </h2>
        <p className="card__note">Add them so drives and jobs that need them rank higher for you.</p>
      </div>
      <div className="chip-select">
        {newSkills.map((skill) => (
          <button key={skill} type="button" className={`chip-toggle ${picked.has(skill) ? 'is-on' : ''}`} aria-pressed={picked.has(skill)} onClick={() => toggle(skill)}>
            {skill}
          </button>
        ))}
      </div>
      <div className="coach-sync__actions">
        <Button onClick={add} loading={saving} disabled={!picked.size}>
          Add {picked.size} to my profile
        </Button>
        <Button as={Link} to="/student/drives" variant="ghost" iconRight={ArrowRight}>
          See my matches
        </Button>
      </div>
    </section>
  );
}

function Fixes({ fixes }) {
  if (!fixes.length) return null;
  return (
    <section className="card" aria-labelledby="fixes-title">
      <h2 id="fixes-title" className="card__title">Fix these first</h2>
      <ol className="coach-fixes">
        {fixes.map((fix, i) => (
          <li key={`${fix.section}-${i}`} className="coach-fix">
            <div className="coach-fix__head">
              <span className="coach-fix__num">{i + 1}</span>
              {fix.section && <span className="coach-fix__section">{fix.section}</span>}
              <p>{fix.issue}</p>
            </div>
            {fix.before && (
              <p className="coach-fix__before">
                <span className="sr-only">Before: </span>
                {fix.before}
              </p>
            )}
            {fix.after && (
              <div className="coach-fix__after">
                <p>
                  <span className="sr-only">After: </span>
                  {fix.after}
                </p>
                <CopyButton text={fix.after} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ListCard({ title, items, good }) {
  if (!items.length) return null;
  return (
    <section className="card">
      <h2 className="card__title">{title}</h2>
      <ul className={`coach-list ${good ? 'coach-list--good' : 'coach-list--gap'}`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function CoachPage() {
  useDocumentTitle('Resume coach');
  const { user } = useAuth();
  const [state, setState] = useState({ review: null, loading: true, running: false, error: null });

  useEffect(() => {
    if (!user.resume) return setState((s) => ({ ...s, loading: false }));
    getReview()
      .then((review) => setState((s) => ({ ...s, review, loading: false })))
      .catch((error) => setState((s) => ({ ...s, error, loading: false })));
    return undefined;
  }, [user.resume]);

  const run = async (refresh) => {
    setState((s) => ({ ...s, running: true, error: null }));
    try {
      const review = await runReview(refresh);
      setState((s) => ({ ...s, review, running: false }));
    } catch (error) {
      setState((s) => ({ ...s, error, running: false }));
    }
  };

  const onSkillsAdded = (added) =>
    setState((s) => ({ ...s, review: { ...s.review, newSkills: s.review.newSkills.filter((x) => !added.includes(x)) } }));

  const { review, loading, running, error } = state;
  const notConfigured = error?.code === 'AI_NOT_CONFIGURED';

  return (
    <div className="page">
      <PageHeader
        eyebrow="AI resume coach"
        title={
          <>
            Make your resume <mark>recruiter-ready.</mark>
          </>
        }
        description="A score, line-by-line fixes and the skills your resume proves, tuned to the roles you want."
        actions={
          review && (
            <Button variant="secondary" icon={RotateCw} onClick={() => run(true)} loading={running}>
              Review again
            </Button>
          )
        }
      />

      {!user.resume ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="Upload your resume first"
            description="The coach reads your resume PDF. Add it on your profile, then come back."
            action={<Button as={Link} to="/student/profile#resume">Upload resume</Button>}
          />
        </div>
      ) : loading ? (
        <CardSkeleton lines={4} />
      ) : running && !review ? (
        <div className="card coach-loading">
          <Spinner size="lg" label="Reviewing your resume" />
          <p>Reading your resume like a recruiter would. This takes up to half a minute.</p>
        </div>
      ) : (
        <>
          {notConfigured ? (
            <div className="card">
              <EmptyState icon={Sparkles} title="The AI coach isn't switched on yet" description={error.message} />
            </div>
          ) : (
            error && (
              <div className="coach-error">
                <ErrorState
                  error={error}
                  title={RESUME_ERRORS.includes(error.code) ? 'Your resume needs attention' : "Couldn't review your resume"}
                  onRetry={RESUME_ERRORS.includes(error.code) ? undefined : () => run(Boolean(review))}
                />
                {RESUME_ERRORS.includes(error.code) && (
                  <Button as={Link} to="/student/profile#resume" variant="secondary" size="sm">
                    Go to my resume
                  </Button>
                )}
              </div>
            )
          )}

          {!review && !notConfigured && (
            <section className="card coach-start">
              <span className="coach-start__icon" aria-hidden="true">
                <Sparkles size={26} />
              </span>
              <h2>Get your resume reviewed</h2>
              <p>
                You'll get a score out of 100, the fixes that matter most with rewritten lines, and the skills your resume proves, so you can add them
                to your profile.
              </p>
              <Button icon={Sparkles} onClick={() => run(false)} loading={running}>
                Review my resume
              </Button>
              <p className="coach-meta">Your resume text is sent to an AI model hosted by Groq. The review is saved, so it only runs again when you ask.</p>
            </section>
          )}

          {review && (
            <div className={`coach-results ${running ? 'is-refreshing' : ''}`}>
              <ScoreCard review={review} />
              <SkillSync newSkills={review.newSkills} onAdded={onSkillsAdded} />
              <Fixes fixes={review.fixes} />
              <div className="panel-grid">
                <ListCard title="Already working" items={review.strengths} good />
                <ListCard title="Missing for the roles you want" items={review.missingForGoals} />
              </div>
              <p className="coach-meta">
                Reviewed {timeAgo(review.reviewedAt)} · AI suggestions, so double-check facts and numbers before you send your resume. Use “How do I fit?”
                on any drive or job for advice on that role.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
