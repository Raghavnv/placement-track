import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PlusCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import { UserAvatar } from '../common/Avatar';
import { IconButton } from '../common/Button';
import ThemeToggle from './ThemeToggle';

const NAV = {
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/drives', label: 'Drives', icon: Briefcase },
    { to: '/student/applications', label: 'My applications', shortLabel: 'Board', icon: KanbanSquare },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: BarChart3, end: true },
    { to: '/admin/drives', label: 'Drives', icon: Briefcase, exclude: '/admin/drives/new' },
    { to: '/admin/drives/new', label: 'New drive', icon: PlusCircle },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  ],
};

function NavItems({ items, onNavigate }) {
  const { pathname } = useLocation();
  return (
    <ul className="nav-list">
      {items.map(({ to, label, icon: Icon, end, exclude }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) => `nav-link ${isActive && pathname !== exclude ? 'active' : ''}`}
            onClick={onNavigate}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export default function AppShell({ variant }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = NAV[variant];

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const handleLogout = () => {
    logout();
    navigate(variant === 'admin' ? '/admin/login' : '/login', { replace: true });
  };

  const subtitle = variant === 'admin' ? 'Officer portal' : 'Student';

  return (
    <div className={`shell shell--${variant}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {drawerOpen && <div className="shell__scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

      <aside className={`sidebar ${drawerOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar__top">
          <Logo subtitle={subtitle} />
          <IconButton icon={X} label="Close menu" className="sidebar__close" onClick={() => setDrawerOpen(false)} />
        </div>
        <nav className="sidebar__nav">
          <NavItems items={items} onNavigate={() => setDrawerOpen(false)} />
        </nav>
        <div className="sidebar__footer">
          <div className="user-chip">
            <UserAvatar name={user.name} />
            <div className="user-chip__text">
              <span className="user-chip__name">{user.name}</span>
              <span className="user-chip__meta">
                {variant === 'admin' ? 'Placement officer' : `${user.rollNumber} · ${user.branch}`}
              </span>
            </div>
          </div>
          <button type="button" className="nav-link nav-link--button" onClick={handleLogout}>
            <LogOut size={20} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <IconButton icon={Menu} label="Open menu" className="topbar__menu" onClick={() => setDrawerOpen(true)} />
          <span className="topbar__logo">
            <Logo size={28} />
          </span>
          <div className="topbar__actions">
            <ThemeToggle />
            <span className="topbar__avatar" title={user.name}>
              <UserAvatar name={user.name} size="sm" />
            </span>
          </div>
        </header>

        <main id="main" className="shell__content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {variant === 'student' && (
        <nav className="bottom-nav" aria-label="Quick navigation">
          {items.map(({ to, label, shortLabel, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="bottom-nav__link">
              <Icon size={22} aria-hidden="true" />
              <span>{shortLabel || label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
