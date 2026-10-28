import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BriefcaseBusiness, CheckCheck, Megaphone, Route } from 'lucide-react';
import { IconButton } from '../common/Button';
import { listNotifications, markNotificationsRead } from '../../services/notificationService';
import { timeAgo } from '../../utils/format';

const POLL_MS = 60000;
const ICONS = { stage: Route, announcement: Megaphone, drive: BriefcaseBusiness };

// Bell with an unread count and a dropdown of recent notifications. Polls every minute while the tab is visible.
export default function NotificationBell() {
  const navigate = useNavigate();
  const [state, setState] = useState({ data: [], unreadCount: 0, loaded: false });
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(() => {
    listNotifications()
      .then((res) => setState({ ...res, loaded: true }))
      .catch(() => setState((s) => ({ ...s, loaded: true })));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAllRead = () => {
    if (!state.unreadCount) return;
    const now = new Date().toISOString();
    setState((s) => ({ ...s, unreadCount: 0, data: s.data.map((n) => ({ ...n, readAt: n.readAt || now })) }));
    markNotificationsRead().catch(load);
  };

  const openItem = (n) => {
    if (!n.readAt) {
      setState((s) => ({ ...s, unreadCount: Math.max(0, s.unreadCount - 1), data: s.data.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)) }));
      markNotificationsRead([n._id]).catch(load);
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const count = state.unreadCount;
  return (
    <div className="bell" ref={wrapRef}>
      <IconButton
        icon={Bell}
        label={count ? `Notifications, ${count} unread` : 'Notifications'}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      />
      {count > 0 && (
        <span className="bell__count" aria-hidden="true">
          {count > 9 ? '9+' : count}
        </span>
      )}
      {open && (
        <div className="bell__panel" role="dialog" aria-label="Notifications">
          <div className="bell__head">
            <h2>Notifications</h2>
            {count > 0 && (
              <button type="button" className="text-link" onClick={markAllRead}>
                <CheckCheck size={14} aria-hidden="true" /> Mark all read
              </button>
            )}
          </div>
          {state.data.length ? (
            <ul className="bell__list">
              {state.data.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                return (
                  <li key={n._id}>
                    <button type="button" className={`bell__item ${n.readAt ? '' : 'is-unread'}`} onClick={() => openItem(n)}>
                      <span className={`bell__icon bell__icon--${n.type}`} aria-hidden="true">
                        <Icon size={15} />
                      </span>
                      <span className="bell__text">
                        <strong>{n.title}</strong>
                        {n.body && <span>{n.body}</span>}
                        <small>{timeAgo(n.createdAt)}</small>
                      </span>
                      {!n.readAt && <span className="bell__dot" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="bell__empty">{state.loaded ? "You're all caught up. Stage changes, announcements and new drives that fit you show up here." : 'Loading…'}</p>
          )}
        </div>
      )}
    </div>
  );
}
