import { Check } from 'lucide-react';

// Big selectable card for onboarding answers (multi-select via aria-pressed).
export default function OptionTile({ selected, onToggle, icon: Icon, emoji, title, hint, disabled }) {
  return (
    <button
      type="button"
      className={`option-tile ${selected ? 'is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onToggle}
      disabled={disabled && !selected}
    >
      <span className="option-tile__icon" aria-hidden="true">
        {Icon ? <Icon size={22} /> : emoji}
      </span>
      <span className="option-tile__text">
        <strong>{title}</strong>
        {hint && <span>{hint}</span>}
      </span>
      <span className="option-tile__check" aria-hidden="true">
        <Check size={14} strokeWidth={3} />
      </span>
    </button>
  );
}
