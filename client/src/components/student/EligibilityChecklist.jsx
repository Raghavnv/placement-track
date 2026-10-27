import { CheckCircle2, XCircle } from 'lucide-react';

export default function EligibilityChecklist({ checks }) {
  return (
    <ul className="checklist">
      {checks.map((check) => (
        <li key={check.field} className={check.passed ? 'is-pass' : 'is-fail'}>
          {check.passed ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}
          <span className="checklist__label">
            {check.label}
            <span className="sr-only">{check.passed ? ': met' : ': not met'}</span>
          </span>
          <span className="checklist__actual">You: {check.actual ?? '-'}</span>
        </li>
      ))}
    </ul>
  );
}
