import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react';
import Button from '../common/Button';
import AnnouncementCard from '../common/AnnouncementCard';
import { useAuth } from '../../context/AuthContext';
import useAsync from '../../hooks/useAsync';
import { listAnnouncements } from '../../services/announcementService';

const seenKey = (userId) => `pt_seen_announcements_${userId}`;

function readSeen(userId) {
  try {
    return localStorage.getItem(seenKey(userId)) || '';
  } catch {
    return '';
  }
}

function writeSeen(userId, value) {
  try {
    if (value > readSeen(userId)) localStorage.setItem(seenKey(userId), value);
  } catch {
    // Storage blocked: everything just stays marked as new.
  }
}

// Notices from the placement cell. Renders nothing when there are none (or they can't be loaded),
// so the page looks exactly as before until an officer posts something.
export default function AnnouncementsPanel({ driveId, title = 'Updates', className = '', preview = 3 }) {
  const { user } = useAuth();
  const [seenAt] = useState(() => readSeen(user._id));
  const [expanded, setExpanded] = useState(false);
  const { data } = useAsync(() => listAnnouncements({ drive: driveId, limit: 20 }).catch(() => null), [driveId]);
  const announcements = data?.data || [];

  useEffect(() => {
    if (data?.data.length) writeSeen(user._id, data.data[0].createdAt);
  }, [data, user._id]);

  if (!announcements.length) return null;

  const newCount = announcements.filter((a) => a.createdAt > seenAt).length;
  const shown = expanded ? announcements : announcements.slice(0, preview);

  return (
    <section className={`card ${className}`} aria-labelledby="updates-title">
      <header className="card__header">
        <span className="card__icon card__icon--lime" aria-hidden="true">
          <Megaphone size={18} />
        </span>
        <div>
          <h2 id="updates-title" className="card__title">{title}</h2>
          <p className="card__subtitle">{newCount ? `${newCount} new from the placement cell` : 'From the placement cell'}</p>
        </div>
      </header>
      <div className="notice-list">
        {shown.map((announcement) => (
          <AnnouncementCard key={announcement._id} announcement={announcement} isNew={announcement.createdAt > seenAt} />
        ))}
      </div>
      {announcements.length > preview && (
        <Button
          variant="ghost"
          size="sm"
          icon={expanded ? ChevronUp : ChevronDown}
          className="notice-more"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : `Show all ${announcements.length}`}
        </Button>
      )}
    </section>
  );
}
