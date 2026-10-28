import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileCheck2, Plus, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button, { IconButton } from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import TagInput from '../../components/common/TagInput';
import { TextareaField, TextField } from '../../components/common/Field';
import { CardSkeleton, ErrorState } from '../../components/common/States';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { getResumeDraft, getResumePdf, saveResumeDraft, useBuilderResume } from '../../services/resumeBuilderService';
import { timeAgo } from '../../utils/format';

const BLANK = {
  education: { institution: '', degree: '', years: '', score: '' },
  experience: { title: '', org: '', dates: '', bullets: [''] },
  projects: { name: '', tech: '', link: '', bullets: [''] },
};
const LIMITS = { education: 4, experience: 5, projects: 6, links: 4, bullets: 6, achievements: 8, certifications: 8 };

// One bullet per line in a textarea; the API wants an array.
const toLines = (list) => (list || []).join('\n');
const fromLines = (text) => text.split('\n').map((l) => l.replace(/^\s*[-•*]\s*/, '')).slice(0, LIMITS.bullets);

function Section({ title, hint, children, action }) {
  return (
    <section className="card builder-section">
      <header className="card__header card__header--split">
        <div>
          <h2 className="card__title">{title}</h2>
          {hint && <p className="card__subtitle">{hint}</p>}
        </div>
        {action}
      </header>
      <div className="form-stack">{children}</div>
    </section>
  );
}

function ItemBox({ label, onRemove, children }) {
  return (
    <div className="builder-item">
      <div className="builder-item__head">
        <span>{label}</span>
        <IconButton icon={Trash2} size="sm" label={`Remove ${label}`} className="icon-btn--danger" onClick={onRemove} />
      </div>
      <div className="form-grid">{children}</div>
    </div>
  );
}

export default function ResumeBuilderPage() {
  useDocumentTitle('Resume builder');
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [savedJson, setSavedJson] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [confirmUse, setConfirmUse] = useState(false);
  const urlRef = useRef('');

  useEffect(() => {
    getResumeDraft()
      .then((res) => {
        setDraft(res.data);
        setSavedJson(JSON.stringify(res.data));
        setUpdatedAt(res.updatedAt);
      })
      .catch(setError);
    return () => urlRef.current && URL.revokeObjectURL(urlRef.current);
  }, []);

  const dirty = draft && JSON.stringify(draft) !== savedJson;
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const setItem = (key, i, field, value) => setDraft((d) => ({ ...d, [key]: d[key].map((item, j) => (j === i ? { ...item, [field]: value } : item)) }));
  const addItem = (key) => setDraft((d) => ({ ...d, [key]: [...d[key], structuredClone(BLANK[key])] }));
  const removeItem = (key, i) => setDraft((d) => ({ ...d, [key]: d[key].filter((_, j) => j !== i) }));

  const save = async () => {
    const res = await saveResumeDraft(draft);
    setDraft(res.data);
    setSavedJson(JSON.stringify(res.data));
    setUpdatedAt(res.updatedAt);
  };

  const run = async (name, action) => {
    setBusy(name);
    try {
      if (dirty || !updatedAt) await save();
      await action();
    } catch (err) {
      toast.error(err.fieldErrors && Object.keys(err.fieldErrors).length ? 'Some fields are too long. Shorten them and try again.' : err.message);
    } finally {
      setBusy('');
    }
  };

  const preview = () =>
    run('preview', async () => {
      const blob = await getResumePdf();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      setPreviewUrl(urlRef.current);
    });

  const download = () =>
    run('download', async () => {
      const blob = await getResumePdf();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `${user.name.replace(/[^\w]+/g, '_')}_Resume.pdf` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

  const useIt = () =>
    run('use', async () => {
      updateUser(await useBuilderResume());
      setConfirmUse(false);
      toast.success('This is now your resume. Officers will see it when they shortlist.');
    });

  if (error) return <div className="page"><ErrorState error={error} /></div>;

  return (
    <div className="page page--wide">
      <PageHeader
        back={{ to: '/student/profile', label: 'My profile' }}
        title="Resume builder"
        description="A clean, one-column resume that recruiter software reads well. Your name, email and phone come from your profile."
        actions={
          draft && (
            <>
              <Button variant="secondary" icon={Download} onClick={download} loading={busy === 'download'}>
                Download PDF
              </Button>
              <Button icon={FileCheck2} onClick={() => setConfirmUse(true)}>
                Use as my resume
              </Button>
            </>
          )
        }
      />

      {!draft ? (
        <CardSkeleton lines={8} />
      ) : (
        <div className="builder">
          <div className="builder__form">
            <Section title="Header" hint={`${user.name} · ${user.email}${user.phone ? ` · ${user.phone}` : ''}`}>
              <TextField label="Headline" value={draft.headline} maxLength={120} onChange={(e) => set('headline', e.target.value)} placeholder="Final-year CSE student who builds web apps" />
              {draft.links.map((link, i) => (
                <div key={i} className="builder-link">
                  <TextField label="Label" value={link.label} maxLength={30} onChange={(e) => setItem('links', i, 'label', e.target.value)} placeholder="GitHub" />
                  <TextField label="Link" value={link.url} maxLength={200} onChange={(e) => setItem('links', i, 'url', e.target.value)} placeholder="github.com/you" />
                  <IconButton icon={Trash2} size="sm" label="Remove link" className="icon-btn--danger" onClick={() => removeItem('links', i)} />
                </div>
              ))}
              {draft.links.length < LIMITS.links && (
                <Button variant="ghost" size="sm" icon={Plus} onClick={() => set('links', [...draft.links, { label: '', url: '' }])}>
                  Add a link (GitHub, LinkedIn, portfolio)
                </Button>
              )}
              <TextareaField label="Summary" rows={3} maxLength={600} value={draft.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Two lines on what you do best and what you're looking for." />
            </Section>

            <Section
              title="Education"
              action={draft.education.length < LIMITS.education && <Button variant="secondary" size="sm" icon={Plus} onClick={() => addItem('education')}>Add</Button>}
            >
              {draft.education.map((e, i) => (
                <ItemBox key={i} label={e.institution || `Education ${i + 1}`} onRemove={() => removeItem('education', i)}>
                  <TextField label="Institution" value={e.institution} maxLength={120} onChange={(ev) => setItem('education', i, 'institution', ev.target.value)} />
                  <TextField label="Degree" value={e.degree} maxLength={120} onChange={(ev) => setItem('education', i, 'degree', ev.target.value)} />
                  <TextField label="Years" value={e.years} maxLength={40} onChange={(ev) => setItem('education', i, 'years', ev.target.value)} placeholder="2023 - 2027" />
                  <TextField label="Score" value={e.score} maxLength={40} onChange={(ev) => setItem('education', i, 'score', ev.target.value)} placeholder="CGPA 8.4/10" />
                </ItemBox>
              ))}
            </Section>

            <Section title="Skills" hint="Most relevant first. These also feed your match scores if you add them to your profile.">
              <TagInput label="Skills" max={30} value={draft.skills} onChange={(skills) => set('skills', skills.slice(0, 30))} placeholder="Type a skill and press Enter" />
            </Section>

            {['experience', 'projects'].map((key) => (
              <Section
                key={key}
                title={key === 'experience' ? 'Experience' : 'Projects'}
                hint="One bullet per line. Start with a verb and include a number where you can."
                action={draft[key].length < LIMITS[key] && <Button variant="secondary" size="sm" icon={Plus} onClick={() => addItem(key)}>Add</Button>}
              >
                {!draft[key].length && <p className="muted builder-empty">{key === 'experience' ? 'Internships, part-time work or club roles.' : 'Your strongest 2-4 projects.'}</p>}
                {draft[key].map((item, i) => (
                  <ItemBox key={i} label={(key === 'experience' ? item.title : item.name) || `${key === 'experience' ? 'Experience' : 'Project'} ${i + 1}`} onRemove={() => removeItem(key, i)}>
                    {key === 'experience' ? (
                      <>
                        <TextField label="Title" value={item.title} maxLength={100} onChange={(e) => setItem(key, i, 'title', e.target.value)} placeholder="Backend Intern" />
                        <TextField label="Organisation" value={item.org} maxLength={100} onChange={(e) => setItem(key, i, 'org', e.target.value)} />
                        <TextField label="Dates" value={item.dates} maxLength={40} onChange={(e) => setItem(key, i, 'dates', e.target.value)} placeholder="May - Jul 2026" />
                      </>
                    ) : (
                      <>
                        <TextField label="Name" value={item.name} maxLength={100} onChange={(e) => setItem(key, i, 'name', e.target.value)} />
                        <TextField label="Tech used" value={item.tech} maxLength={150} onChange={(e) => setItem(key, i, 'tech', e.target.value)} placeholder="React, Flask, Docker" />
                        <TextField label="Link" value={item.link} maxLength={200} onChange={(e) => setItem(key, i, 'link', e.target.value)} placeholder="github.com/you/project" />
                      </>
                    )}
                    <TextareaField
                      label="Bullets"
                      className="form-grid__full"
                      rows={4}
                      value={toLines(item.bullets)}
                      onChange={(e) => setItem(key, i, 'bullets', fromLines(e.target.value))}
                      placeholder="Built … that … (number)"
                      hint={`Up to ${LIMITS.bullets} lines`}
                    />
                  </ItemBox>
                ))}
              </Section>
            ))}

            {['achievements', 'certifications'].map((key) => (
              <Section key={key} title={key === 'achievements' ? 'Achievements' : 'Certifications'}>
                <TextareaField
                  label={`${key === 'achievements' ? 'Achievements' : 'Certifications'}, one per line`}
                  rows={3}
                  value={toLines(draft[key])}
                  onChange={(e) => set(key, e.target.value.split('\n').slice(0, LIMITS[key]))}
                  placeholder={key === 'achievements' ? 'Smart India Hackathon 2025 finalist' : 'AWS Cloud Practitioner (2026)'}
                />
              </Section>
            ))}
          </div>

          <aside className="builder__preview">
            <div className="card builder-preview">
              <header className="builder-preview__bar">
                <span>{dirty ? 'Unsaved changes' : updatedAt ? `Saved ${timeAgo(updatedAt)}` : 'Not saved yet'}</span>
                <span className="builder-preview__actions">
                  <Button variant="ghost" size="sm" icon={Save} onClick={() => run('save', async () => toast.success('Saved'))} loading={busy === 'save'} disabled={!dirty && Boolean(updatedAt)}>
                    Save
                  </Button>
                  <Button variant="secondary" size="sm" icon={RefreshCw} onClick={preview} loading={busy === 'preview'}>
                    {previewUrl ? 'Refresh preview' : 'Preview'}
                  </Button>
                </span>
              </header>
              {previewUrl ? (
                <iframe title="Resume preview" src={`${previewUrl}#toolbar=0&view=FitH`} className="builder-preview__frame" />
              ) : (
                <div className="builder-preview__empty">
                  <p>See exactly what you'll download.</p>
                  <Button size="sm" icon={RefreshCw} onClick={preview} loading={busy === 'preview'}>
                    Show preview
                  </Button>
                </div>
              )}
              <p className="builder-preview__note">
                <Sparkles size={13} aria-hidden="true" /> After using it as your resume, run the <Link to="/student/coach">Resume coach</Link> on it.
              </p>
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmUse}
        title="Use this as your resume?"
        description={user.resume ? `It replaces ${user.resume.fileName}. Officers see the new one straight away.` : 'Officers see it when they shortlist you.'}
        confirmLabel="Use as my resume"
        loading={busy === 'use'}
        onConfirm={useIt}
        onClose={() => setConfirmUse(false)}
      />
    </div>
  );
}
