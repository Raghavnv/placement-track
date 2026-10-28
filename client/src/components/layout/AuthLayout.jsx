import { BarChart3, BellRing, CalendarCheck2, KanbanSquare, Sparkles, Users } from 'lucide-react';
import Logo from '../common/Logo';
import Marquee from '../common/Marquee';
import ThemeToggle from './ThemeToggle';

const COPY = {
  student: {
    sticker: 'Placement season is live',
    headline: ['Your placement season,', 'on track.'],
    lead: 'Tell us what you are good at. We match you to drives you qualify for, remind you before deadlines and track every round to the offer.',
    points: [
      { icon: Sparkles, text: 'Match scores for every drive' },
      { icon: KanbanSquare, text: 'A board for every application' },
      { icon: BellRing, text: 'Deadline alerts in your calendar' },
    ],
  },
  admin: {
    sticker: 'Officer portal',
    headline: ['Run the season', 'like clockwork.'],
    lead: 'Post drives, move applicants through each round and see exactly where students drop off.',
    points: [
      { icon: Users, text: 'Applicants per drive, round by round' },
      { icon: BarChart3, text: 'Live placement rate and funnel' },
      { icon: CalendarCheck2, text: 'Deadlines and drive days at a glance' },
    ],
  },
};

const TICKETS_A = [
  ['Infosys', 'Systems Engineer', '6.5'],
  ['Zoho', 'Member Technical Staff', '8.4'],
  ['Google', 'SWE Intern', '14.4'],
  ['Deloitte', 'Analyst', '7.6'],
  ['TCS', 'Ninja Developer', '3.6'],
];
const TICKETS_B = [
  ['Bosch', 'Graduate Engineer Trainee', '5.5'],
  ['Accenture', 'Associate SE', '4.5'],
  ['Wipro', 'Project Engineer', '3.5'],
  ['Razorpay', 'Backend Engineer', '18'],
  ['Atlassian', 'Graduate SDE', '24'],
];

function Ticket({ company, role, pkg }) {
  return (
    <span className="ticket-chip">
      <span className="ticket-chip__mono">{company[0]}</span>
      <span className="ticket-chip__text">
        <strong>{company}</strong>
        <small>{role}</small>
      </span>
      <span className="ticket-chip__pkg">₹{pkg}L</span>
    </span>
  );
}

export default function AuthLayout({ variant = 'student', children, wide = false }) {
  const copy = COPY[variant];
  return (
    <div className={`auth auth--${variant}`}>
      <section className="auth__brand" aria-label="About PlacementTrack">
        <div className="auth__brand-top">
          <Logo size={36} />
        </div>

        <div className="auth__pitch">
          <span className="sticker sticker--lime">{copy.sticker}</span>
          <h1 className="auth__headline">
            {copy.headline[0]} <mark>{copy.headline[1]}</mark>
          </h1>
          <p className="auth__lead">{copy.lead}</p>
        </div>

        <div className="auth__tickets" aria-hidden="true">
          <Marquee speed={38}>
            {TICKETS_A.map(([c, r, p]) => (
              <Ticket key={c} company={c} role={r} pkg={p} />
            ))}
          </Marquee>
          <Marquee speed={46} reverse>
            {TICKETS_B.map(([c, r, p]) => (
              <Ticket key={c} company={c} role={r} pkg={p} />
            ))}
          </Marquee>
          <div className="auth__offer" aria-hidden="true">
            <span className="auth__offer-emoji">🎉</span>
            <span>
              <strong>Offer received</strong>
              <small>Deloitte · Analyst · ₹7.6 LPA</small>
            </span>
          </div>
        </div>

        <ul className="auth__points">
          {copy.points.map(({ icon: Icon, text }) => (
            <li key={text}>
              <Icon size={18} aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </section>

      <section className="auth__panel">
        <div className="auth__panel-top">
          <span className="auth__mobile-logo">
            <Logo size={30} />
          </span>
          <ThemeToggle />
        </div>
        <div className={`auth__form-wrap ${wide ? 'auth__form-wrap--wide' : ''}`}>{children}</div>
      </section>
    </div>
  );
}
