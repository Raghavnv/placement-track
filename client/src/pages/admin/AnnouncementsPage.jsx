import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Megaphone, Send, Trash2, X } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button, { IconButton } from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import AnnouncementCard from '../../components/common/AnnouncementCard';
import { Segmented, SelectField, TextareaField, TextField } from '../../components/common/Field';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '../../components/common/States';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { createAnnouncement, deleteAnnouncement, listAnnouncements } from '../../services/announcementService';
import { getApplicants, listDrives } from '../../services/driveService';
import { getStats } from '../../services/adminService';
import { pluralize } from '../../utils/format';
import { STAGES, STAGE_LABELS } from '../../utils/stages';

const PAGE_SIZE = 10;
const EMPTY = { title: '', message: '', link: '' };

function validate(form, audience, driveId) {
  const errors = {};
  if (audience === 'drive' && !driveId) errors.drive = 'Choose a drive';
  if (form.title.trim().length < 3) errors.title = 'Give it a short title (3+ characters)';
  if (!form.message.trim()) errors.message = 'Write a message';
  if (form.link.trim() && !/^https?:\/\/\S+\.\S+/i.test(form.link.trim())) errors.link = 'Use a full link starting with https://';
  return errors;
}

export default function AnnouncementsPage() {
  useDocumentTitle('Announcements');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const filterDrive = params.get('drive') || '';
  const page = Number(params.get('page')) || 1;

  const [audience, setAudience] = useState(filterDrive ? 'drive' : 'all');
  const [driveId, setDriveId] = useState(filterDrive);
  const [stages, setStages] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [posting, setPosting] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data: drives } = useAsync(() => listDrives({ status: 'all', sort: '-createdAt', limit: 50 }).then((r) => r.data), []);
  const { data: list, error, loading, reload } = useAsync(
    () => listAnnouncements({ drive: filterDrive, page, limit: PAGE_SIZE }),
    [filterDrive, page],
  );

  // Live "who will see this" count for the composer.
  const [reach, setReach] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setReach(null);
    const count =
      audience === 'all'
        ? getStats().then((s) => s.totals.students)
        : driveId
          ? getApplicants(driveId, { limit: 1 }).then(({ stageCounts }) =>
              (stages.length ? stages : STAGES).reduce((sum, s) => sum + (stageCounts[s] || 0), 0),
            )
          : Promise.resolve(null);
    count.then((n) => !cancelled && setReach(n)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [audience, driveId, stages]);

  const drive = drives?.find((d) => d._id === driveId);
  const filterDriveInfo = drives?.find((d) => d._id === filterDrive);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };
  const toggleStage = (stage) => setStages((list) => (list.includes(stage) ? list.filter((s) => s !== stage) : [...list, stage]));

  const setParam = (key, value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace: true },
    );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form, audience, driveId);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setPosting(true);
    setFormError('');
    try {
      const created = await createAnnouncement({
        title: form.title.trim(),
        message: form.message.trim(),
        link: form.link.trim(),
        drive: audience === 'drive' ? driveId : null,
        stages: audience === 'drive' ? stages : [],
      });
      toast.success(`Posted to ${pluralize(created.audienceCount, 'student')}`);
      setForm(EMPTY);
      if (page !== 1) setParam('page', '');
      else reload();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.code === 'VALIDATION_ERROR' ? '' : err.message);
    } finally {
      setPosting(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAnnouncement(toDelete._id);
      toast.success('Announcement deleted');
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const preview = {
    title: form.title.trim() || 'Your title',
    message: form.message.trim() || 'Your message to students appears here.',
    link: form.link.trim(),
    drive: audience === 'drive' && drive ? drive : null,
    stages: audience === 'drive' ? stages : [],
    createdAt: new Date().toISOString(),
  };

  let reachText = 'Pick a drive to see who gets this.';
  if (reach !== null) reachText = `${pluralize(reach, 'student')} will see this on their dashboard.`;
  else if (audience === 'all' || driveId) reachText = 'Counting students…';

  return (
    <div className="page page--wide">
      <PageHeader
        eyebrow="Placement cell"
        title="Announcements"
        description="Venues, test links and results, straight to the right students."
      />

      <form className="drive-form" onSubmit={handleSubmit} noValidate>
        <div className="drive-form__main">
          <fieldset className="card form-section">
            <legend className="form-section__title">New announcement</legend>
            {formError && <InlineAlert>{formError}</InlineAlert>}

            <div className="field">
              <span className="field__label">Send to</span>
              <Segmented
                label="Send to"
                name="audience"
                value={audience}
                onChange={(value) => {
                  setAudience(value);
                  setErrors((errs) => ({ ...errs, drive: undefined }));
                }}
                options={[
                  { value: 'all', label: 'All students' },
                  { value: 'drive', label: "A drive's applicants" },
                ]}
              />
            </div>

            {audience === 'drive' && (
              <>
                <SelectField
                  label="Drive"
                  required
                  placeholder="Choose a drive"
                  value={driveId}
                  onChange={(e) => {
                    setDriveId(e.target.value);
                    setErrors((errs) => ({ ...errs, drive: undefined }));
                  }}
                  error={errors.drive}
                  options={(drives || []).map((d) => ({ value: d._id, label: `${d.companyName} · ${d.role}` }))}
                />
                <div className="field">
                  <div className="field__label-row">
                    <span className="field__label" id="stages-label">Applicants at</span>
                    <span className="field__hint">{stages.length ? `${stages.length} selected` : 'Every applicant'}</span>
                  </div>
                  <div className="chip-select" role="group" aria-labelledby="stages-label">
                    <button
                      type="button"
                      className={`chip-toggle ${stages.length === 0 ? 'is-on' : ''}`}
                      aria-pressed={stages.length === 0}
                      onClick={() => setStages([])}
                    >
                      All stages
                    </button>
                    {STAGES.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        className={`chip-toggle ${stages.includes(stage) ? 'is-on' : ''}`}
                        aria-pressed={stages.includes(stage)}
                        onClick={() => toggleStage(stage)}
                      >
                        {STAGE_LABELS[stage]}
                      </button>
                    ))}
                  </div>
                  {errors.stages && <p className="field__error">{errors.stages}</p>}
                </div>
              </>
            )}

            <TextField label="Title" required maxLength={120} placeholder="e.g. Aptitude test venue and timing" value={form.title} onChange={set('title')} error={errors.title} />
            <TextareaField
              label="Message"
              required
              rows={5}
              maxLength={2000}
              placeholder="Where, when, what to bring, and anything else students need to know."
              value={form.message}
              onChange={set('message')}
              error={errors.message}
            />
            <TextField
              label="Link"
              type="url"
              inputMode="url"
              placeholder="https://"
              hint="Optional: test link, registration form or venue map"
              value={form.link}
              onChange={set('link')}
              error={errors.link}
            />

            <div className="form-actions">
              <Button type="submit" size="lg" icon={Send} loading={posting}>
                Post announcement
              </Button>
            </div>
          </fieldset>
        </div>

        <aside className="drive-form__preview" aria-label="Student preview">
          <p className="eyebrow">Student preview</p>
          <div className="preview-frame" inert="">
            <AnnouncementCard announcement={preview} isNew />
          </div>
          <p className="muted preview-note">{reachText}</p>
        </aside>
      </form>

      <section className="notice-section" aria-labelledby="posted-title">
        <header className="card__header">
          <span className="card__icon card__icon--lime" aria-hidden="true">
            <Megaphone size={18} />
          </span>
          <div>
            <h2 id="posted-title" className="card__title">Posted</h2>
            <p className="card__subtitle">
              {filterDrive ? `Only ${filterDriveInfo ? filterDriveInfo.companyName : 'this drive'}` : 'Newest first'}
            </p>
          </div>
          {filterDrive && (
            <Button variant="ghost" size="sm" icon={X} className="card__action" onClick={() => setParam('drive', '')}>
              Show all
            </Button>
          )}
        </header>

        {error && <ErrorState error={error} onRetry={reload} />}

        {loading && !list ? (
          <div className="notice-list">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} height={110} radius={12} />
            ))}
          </div>
        ) : list?.data.length ? (
          <div className={`notice-list ${loading ? 'is-refreshing' : ''}`}>
            {list.data.map((announcement) => (
              <AnnouncementCard
                key={announcement._id}
                announcement={announcement}
                showAudience
                actions={
                  <IconButton icon={Trash2} label={`Delete "${announcement.title}"`} className="icon-btn--danger" onClick={() => setToDelete(announcement)} />
                }
              />
            ))}
          </div>
        ) : (
          list && (
            <div className="card">
              <EmptyState
                icon={Megaphone}
                title="Nothing posted yet"
                description="Post a test venue, an interview schedule or results, and students see it on their dashboard."
              />
            </div>
          )
        )}

        {list && (
          <Pagination
            page={list.pagination.page}
            totalPages={list.pagination.totalPages}
            total={list.pagination.total}
            itemLabel="announcements"
            onChange={(p) => setParam('page', String(p))}
          />
        )}
      </section>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        tone="danger"
        confirmLabel="Delete"
        title={toDelete ? `Delete "${toDelete.title}"?` : ''}
        description="Students will no longer see it. This can't be undone."
      />
    </div>
  );
}
