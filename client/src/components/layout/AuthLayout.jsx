import { BellRing, CalendarCheck2, KanbanSquare, BarChart3, Filter, Users } from 'lucide-react';
import Logo from '../common/Logo';
import ThemeToggle from './ThemeToggle';

const COPY = {
  student: {
    headline: 'Every drive. Every round. One board.',
    lead: 'Find drives you qualify for, apply in one click and watch each application move from aptitude to offer.',
    points: [
      { icon: Filter, text: 'Eligibility checked for you on every drive' },
      { icon: KanbanSquare, text: 'A Kanban board for all your applications' },
      { icon: BellRing, text: 'Deadline reminders and calendar sync' },
    ],
  },
  admin: {
    headline: 'Run the placement season from one dashboard.',
    lead: 'Post drives, move applicants through each round and see exactly where students drop off.',
    points: [
      { icon: Users, text: 'Applicants per drive with stage tracking' },
      { icon: BarChart3, text: 'Live placement rate and package stats' },
      { icon: CalendarCheck2, text: 'Deadlines and drive dates at a glance' },
    ],
  },
};

const DEMO_CARDS = [
  { company: 'Zoho', role: 'MTS', column: 0, delay: '0s' },
  { company: 'Infosys', role: 'Systems Engg.', column: 1, delay: '-2s' },
  { company: 'Deloitte', role: 'Analyst', column: 2, delay: '-4s' },
];

// Decorative mini board: cards glide across stages, hinting at what the app does.
function BoardIllustration() {
  return (
    <div className="auth-board" aria-hidden="true">
      {['Applied', 'Aptitude', 'Interview', 'Offer'].map((label, i) => (
        <div key={label} className={`auth-board__col auth-board__col--${i}`}>
          <span className="auth-board__label">{label}</span>
        </div>
      ))}
      {DEMO_CARDS.map((card) => (
        <div key={card.company} className="auth-board__card" style={{ animationDelay: card.delay, '--row': card.column }}>
          <span className="auth-board__mono">{card.company[0]}</span>
          <span>
            <strong>{card.company}</strong>
            <small>{card.role}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AuthLayout({ variant = 'student', children }) {
  const copy = COPY[variant];
  return (
    <div className={`auth auth--${variant}`}>
      <section className="auth__brand">
        <div className="auth__brand-inner">
          <Logo size={36} subtitle={variant === 'admin' ? 'Officer portal' : undefined} />
          <div className="auth__pitch">
            <h1 className="auth__headline">{copy.headline}</h1>
            <p className="auth__lead">{copy.lead}</p>
          </div>
          <BoardIllustration />
          <ul className="auth__points">
            {copy.points.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="auth__point-icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="auth__panel">
        <div className="auth__panel-top">
          <span className="auth__mobile-logo">
            <Logo size={30} />
          </span>
          <ThemeToggle />
        </div>
        <div className="auth__form-wrap">{children}</div>
      </section>
    </div>
  );
}
