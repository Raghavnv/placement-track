import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Flag, Mic, MicOff, SearchX } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/common/States';
import InterviewButton from '../../components/student/InterviewButton';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { finishInterview, getInterview, saveAnswer } from '../../services/interviewService';
import { formatDateTime } from '../../utils/format';

const MAX_ANSWER = 4000;
const KIND_LABELS = { technical: 'Technical', scenario: 'Scenario', project: 'Your project', behavioural: 'Behavioural' };
const TIPS = {
  technical: 'Explain how it works and why, then give a concrete example. Mention trade-offs if there are any.',
  scenario: 'Think out loud: clarify the problem, list what you would check or try, and explain the order you would do it in.',
  project: "Be specific: what you built, the decision you made, what you'd change now. Use real numbers if you have them.",
  behavioural: 'Use STAR: the Situation, your Task, the Actions you took, and the Result. Focus on what you did.',
};
const VERDICT_TONES = { strong: 'high', borderline: 'mid', 'not-yet': 'low' };
const tone = (score, max = 100) => (score / max >= 0.75 ? 'high' : score / max >= 0.5 ? 'mid' : 'low');

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// Dictation with the browser's speech recognition (Chrome, Edge). Hidden where unsupported.
function useDictation(onText) {
  const recRef = useRef(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const [listening, setListening] = useState(false);

  const stop = () => recRef.current?.stop();
  useEffect(() => stop, []);

  const start = () => {
    if (!Recognition) return;
    const rec = new Recognition();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      const said = Array.from(event.results)
        .slice(event.resultIndex)
        .map((r) => r[0].transcript)
        .join(' ');
      onTextRef.current(said.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return { supported: Boolean(Recognition), listening, start, stop };
}

function useElapsed(resetKey) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [resetKey]);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function InterviewInProgress({ interview, onGraded }) {
  const toast = useToast();
  const total = interview.questions.length;
  const firstUnanswered = interview.questions.findIndex((q) => !q.answer);
  const [index, setIndex] = useState(firstUnanswered === -1 ? total - 1 : firstUnanswered);
  const [drafts, setDrafts] = useState(() => interview.questions.map((q) => q.answer));
  const [saved, setSaved] = useState(() => interview.questions.map((q) => q.answer));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const elapsed = useElapsed(index);
  const question = interview.questions[index];

  const setDraft = (value) => setDrafts((d) => d.map((x, i) => (i === index ? value.slice(0, MAX_ANSWER) : x)));
  const dictation = useDictation((said) => setDraft(`${drafts[index]}${drafts[index] && !drafts[index].endsWith(' ') ? ' ' : ''}${said}`));

  const persist = async (i) => {
    if (drafts[i] === saved[i]) return;
    await saveAnswer(interview._id, i, drafts[i]);
    setSaved((s) => s.map((x, j) => (j === i ? drafts[i] : x)));
  };

  const goTo = async (next) => {
    dictation.stop();
    setBusy('save');
    try {
      await persist(index);
      setIndex(next);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const finish = async () => {
    dictation.stop();
    setBusy('finish');
    setError(null);
    try {
      await persist(index);
      onGraded(await finishInterview(interview._id));
    } catch (err) {
      setError(err);
      setBusy('');
    }
  };

  const answeredCount = drafts.filter((d) => d.trim()).length;

  if (busy === 'finish') {
    return (
      <div className="card coach-loading">
        <Spinner size="lg" label="Grading your interview" />
        <p>Your interviewer is grading each answer against what they were listening for. About 30 seconds.</p>
      </div>
    );
  }

  return (
    <div className="interview-room">
      <nav className="interview-steps" aria-label="Questions">
        {interview.questions.map((q, i) => (
          <button
            key={i}
            type="button"
            className={`interview-steps__dot ${i === index ? 'is-current' : ''} ${drafts[i].trim() ? 'is-answered' : ''}`}
            onClick={() => i !== index && goTo(i)}
            aria-current={i === index ? 'step' : undefined}
            aria-label={`Question ${i + 1}${drafts[i].trim() ? ', answered' : ''}`}
            disabled={Boolean(busy)}
          >
            {drafts[i].trim() ? <CheckCircle2 size={16} aria-hidden="true" /> : i + 1}
          </button>
        ))}
        <span className="interview-steps__count">
          {answeredCount} of {total} answered
        </span>
      </nav>

      <section className="card interview-question" aria-labelledby="question-text">
        <div className="interview-question__meta">
          <span className="badge badge--tone-primary">{KIND_LABELS[question.kind]}</span>
          {question.focus && <span className="coach-fix__section">{question.focus}</span>}
          <span className={`interview-difficulty interview-difficulty--${question.difficulty}`}>{question.difficulty}</span>
          <span className="interview-question__timer" title="Time on this question">
            <Clock size={14} aria-hidden="true" /> {elapsed}
          </span>
        </div>
        <p className="interview-question__number">Question {index + 1} of {total}</p>
        <h2 id="question-text" className="interview-question__text">{question.question}</h2>
        <p className="interview-question__tip">{TIPS[question.kind]}</p>

        <label className="sr-only" htmlFor="answer">Your answer</label>
        <textarea
          id="answer"
          className="input interview-answer"
          rows={10}
          value={drafts[index]}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your answer as you would say it in the interview…"
          maxLength={MAX_ANSWER}
        />
        <div className="interview-answer__bar">
          {dictation.supported && (
            <Button
              variant={dictation.listening ? 'danger' : 'ghost'}
              size="sm"
              icon={dictation.listening ? MicOff : Mic}
              onClick={dictation.listening ? dictation.stop : dictation.start}
              aria-pressed={dictation.listening}
            >
              {dictation.listening ? 'Stop dictating' : 'Dictate'}
            </Button>
          )}
          <span className="interview-answer__count">
            {drafts[index].length}/{MAX_ANSWER}
          </span>
        </div>
      </section>

      {error && <ErrorState error={error} title="Couldn't grade the interview" onRetry={finish} />}

      <div className="interview-nav">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => goTo(index - 1)} disabled={index === 0 || Boolean(busy)}>
          Previous
        </Button>
        {index < total - 1 ? (
          <Button iconRight={ArrowRight} onClick={() => goTo(index + 1)} loading={busy === 'save'}>
            {drafts[index].trim() ? 'Save and next' : 'Skip for now'}
          </Button>
        ) : (
          <Button variant="lime" icon={Flag} onClick={finish} disabled={!answeredCount || Boolean(busy)}>
            Finish and get my report
          </Button>
        )}
      </div>
      {index === total - 1 && answeredCount < total && (
        <p className="coach-meta">Unanswered questions score 0, just like in a real interview. Go back to any question using the numbers above.</p>
      )}
    </div>
  );
}

function InterviewReport({ interview }) {
  const { report } = interview;
  const driveId = interview.target.kind === 'drive' ? interview.target.drive : null;
  return (
    <div className="coach-results">
      <section className="card coach-hero" aria-labelledby="verdict-title">
        <div className="coach-hero__score">
          <p className={`coach-score coach-score--lg coach-score--${tone(report.overallScore)}`}>
            <strong>{report.overallScore}</strong>
            <span>/100</span>
          </p>
          <p id="verdict-title" className={`interview-verdict interview-verdict--${VERDICT_TONES[report.verdict]}`}>
            {report.verdictLabel}
          </p>
          <p className="coach-meta">
            {report.answered} of {interview.questions.length} answered · {interview.target.level}
          </p>
        </div>
        <div className="interview-recommendation">
          <h2 className="coach-subhead">Would you be good for this role?</h2>
          <p>{report.recommendation}</p>
          {report.summary && <p className="interview-recommendation__summary">{report.summary}</p>}
        </div>
      </section>

      {report.competencies.length > 0 && (
        <section className="card" aria-labelledby="competency-title">
          <h2 id="competency-title" className="card__title">How you did on what this role needs</h2>
          <ul className="coach-bars coach-bars--wide">
            {report.competencies.map((c) => (
              <li key={c.name}>
                <span className="coach-bars__label">{c.name}</span>
                <span className="coach-bars__track" role="progressbar" aria-label={c.name} aria-valuenow={c.score} aria-valuemin={0} aria-valuemax={100}>
                  <span className={`coach-bars__fill coach-bars__fill--${tone(c.score)}`} style={{ width: `${c.score}%` }} />
                </span>
                <span className="coach-bars__value">{c.score}</span>
                <span className="coach-bars__note">{c.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" aria-labelledby="answers-title">
        <h2 id="answers-title" className="card__title">Answer by answer</h2>
        <ol className="interview-answers">
          {interview.questions.map((q, i) => (
            <li key={i} className="interview-answers__item">
              <div className="interview-answers__head">
                <span className={`interview-answers__score interview-answers__score--${tone(q.score, 10)}`}>
                  {q.score}<small>/10</small>
                </span>
                <div>
                  <p className="interview-answers__kind">
                    Q{i + 1} · {KIND_LABELS[q.kind]}{q.focus ? ` · ${q.focus}` : ''}
                  </p>
                  <p className="interview-answers__question">{q.question}</p>
                </div>
              </div>
              <p className="interview-answers__feedback">{q.feedback}</p>
              <details className="interview-answers__more">
                <summary>Your answer and what a strong answer covers</summary>
                <div className="interview-answers__detail">
                  <h3 className="coach-subhead">Your answer</h3>
                  <p className="interview-answers__yours">{q.answer || '(not answered)'}</p>
                  {q.strongAnswer && (
                    <>
                      <h3 className="coach-subhead">A strong answer</h3>
                      <p>{q.strongAnswer}</p>
                    </>
                  )}
                  {q.rubric.length > 0 && (
                    <>
                      <h3 className="coach-subhead">What the interviewer was listening for</h3>
                      <ul className="coach-list">
                        {q.rubric.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>

      {report.nextSteps.length > 0 && (
        <section className="card" aria-labelledby="next-title">
          <h2 id="next-title" className="card__title">Practise these before the real thing</h2>
          <ul className="coach-list coach-list--gap">
            {report.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="interview-nav">
        {driveId ? (
          <>
            <Button as={Link} to={`/student/drives/${driveId}`} variant="secondary" icon={ArrowLeft}>
              Back to the drive
            </Button>
            <InterviewButton target={{ driveId }} variant="primary" label="Practise again with new questions" />
          </>
        ) : (
          <Button as={Link} to="/student/jobs" variant="secondary" icon={ArrowLeft}>
            Back to jobs
          </Button>
        )}
      </div>
      <p className="coach-meta">Graded by AI on {formatDateTime(interview.completedAt)}. Use it as practice feedback, not a prediction.</p>
    </div>
  );
}

export default function InterviewRoomPage() {
  const { id } = useParams();
  const [state, setState] = useState({ interview: null, error: null });
  useDocumentTitle(state.interview ? `Interview: ${state.interview.target.title}` : 'Mock interview');

  useEffect(() => {
    setState({ interview: null, error: null });
    getInterview(id)
      .then((interview) => setState({ interview, error: null }))
      .catch((error) => setState({ interview: null, error }));
  }, [id]);

  const { interview, error } = state;
  const done = interview?.status === 'completed';

  return (
    <div className="page">
      <PageHeader
        back={{ to: '/student/interviews', label: 'All mock interviews' }}
        eyebrow={interview ? `Mock interview · ${interview.target.level}` : 'Mock interview'}
        title={interview ? (done ? 'Interview report' : interview.target.title) : 'Loading…'}
        description={interview && (done ? interview.target.title : 'Answer like you would in the room. Your answers save as you move between questions.')}
      />
      {error?.status === 404 ? (
        <div className="card">
          <EmptyState icon={SearchX} title="Interview not found" description="It may belong to another account." />
        </div>
      ) : error ? (
        <ErrorState error={error} />
      ) : !interview ? (
        <CardSkeleton lines={5} />
      ) : done ? (
        <InterviewReport interview={interview} />
      ) : (
        <InterviewInProgress interview={interview} onGraded={(graded) => setState({ interview: graded, error: null })} />
      )}
    </div>
  );
}
