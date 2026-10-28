import { useEffect, useState } from 'react';
import { Coffee } from 'lucide-react';
import { subscribeSlowRequests } from '../../services/api';

// The free Render plan sleeps when idle; tell users why the first request is slow.
export default function ServerWakeBanner() {
  const [slow, setSlow] = useState(false);
  useEffect(() => subscribeSlowRequests(setSlow), []);
  if (!slow) return null;
  return (
    <div className="wake-banner" role="status">
      <Coffee size={18} aria-hidden="true" />
      <span>
        <strong>Waking up the server…</strong> Free hosting sleeps when idle, so the first request can take up to a minute.
      </span>
    </div>
  );
}
