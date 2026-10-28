import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Switch, TextField } from '../../components/common/Field';
import { TierBadge } from '../../components/common/Badges';
import { CardSkeleton, ErrorState } from '../../components/common/States';
import { useToast } from '../../context/ToastContext';
import useAsync from '../../hooks/useAsync';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { getPolicy, updatePolicy } from '../../services/placementService';
import { formatDateTime } from '../../utils/format';

function validate(form) {
  const errors = {};
  const dream = Number(form.dreamMinPackage);
  const superDream = Number(form.superDreamMinPackage);
  if (!(dream >= 0.5 && dream <= 200)) errors.dreamMinPackage = 'Enter a package between 0.5 and 200 LPA';
  if (!(superDream >= 0.5 && superDream <= 200)) errors.superDreamMinPackage = 'Enter a package between 0.5 and 200 LPA';
  else if (!errors.dreamMinPackage && superDream <= dream) errors.superDreamMinPackage = 'Must be higher than the Dream cutoff';
  return errors;
}

export default function PolicyPage() {
  useDocumentTitle('Placement policy');
  const toast = useToast();
  const { data, error, reload, setData } = useAsync(getPolicy, []);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ enabled: data.policy.enabled, dreamMinPackage: String(data.policy.dreamMinPackage), superDreamMinPackage: String(data.policy.superDreamMinPackage) });
  }, [data]);

  const save = async (event) => {
    event.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      setData(await updatePolicy({ enabled: form.enabled, dreamMinPackage: Number(form.dreamMinPackage), superDreamMinPackage: Number(form.superDreamMinPackage) }));
      toast.success('Placement policy saved. It applies to every drive straight away.');
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (!Object.keys(err.fieldErrors || {}).length) toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bind = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })), error: errors[key] });

  return (
    <div className="page">
      <PageHeader
        eyebrow="Officer settings"
        title={
          <>
            Placement <mark>policy.</mark>
          </>
        }
        description="Tier drives by package and decide who can keep applying after an offer. Changes apply immediately."
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      {!form ? (
        !error && <CardSkeleton lines={4} />
      ) : (
        <div className="details-layout">
          <form className="card policy-form" onSubmit={save} noValidate>
            <Switch label="Apply the offer policy this season" checked={form.enabled} onChange={(enabled) => setForm((f) => ({ ...f, enabled }))} />
            <div className="policy-form__row">
              <TextField label="Dream from" type="number" inputMode="decimal" step="0.5" prefix="₹" suffix="LPA" required {...bind('dreamMinPackage')} />
              <TextField label="Super Dream from" type="number" inputMode="decimal" step="0.5" prefix="₹" suffix="LPA" required {...bind('superDreamMinPackage')} />
            </div>
            <div>
              <Button type="submit" icon={Save} loading={saving}>
                Save policy
              </Button>
            </div>
            {data.policy.updatedAt && <p className="coach-meta">Last changed {formatDateTime(data.policy.updatedAt)}</p>}
          </form>

          <aside className="card policy-explainer">
            <h2 className="card__title">How it works</h2>
            <ul className="placement-status__tiers">
              <li>
                <TierBadge tier="regular" /> <span>below ₹{form.dreamMinPackage || '?'} LPA</span>
              </li>
              <li>
                <TierBadge tier="dream" /> <span>₹{form.dreamMinPackage || '?'} to {form.superDreamMinPackage || '?'} LPA</span>
              </li>
              <li>
                <TierBadge tier="super-dream" /> <span>₹{form.superDreamMinPackage || '?'} LPA and above</span>
              </li>
            </ul>
            <ul className="coach-list">
              <li>A student is placed once you move them to <strong>Offer</strong> on a full-time drive.</li>
              <li>With a Regular offer they can apply only to Dream and Super Dream drives; with Dream, only Super Dream.</li>
              <li>Super Dream holders are done with full-time drives.</li>
              <li>Internship drives and internship offers are never limited.</li>
              {!form.enabled && <li>While the policy is off, offers don't limit anyone.</li>}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
