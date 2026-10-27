import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';

// Chips you can type to add, with one-tap suggestions underneath.
export default function TagInput({ label, value, onChange, suggestions = [], max = 25, placeholder = 'Type and press Enter' }) {
  const id = useId();
  const [text, setText] = useState('');
  const lower = new Set(value.map((v) => v.toLowerCase()));
  const full = value.length >= max;

  const add = (raw) => {
    const tag = raw.trim().replace(/\s+/g, ' ');
    if (!tag || tag.length > 40 || lower.has(tag.toLowerCase()) || full) return;
    onChange([...value, tag]);
    setText('');
  };
  const remove = (tag) => onChange(value.filter((v) => v !== tag));

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(text);
    } else if (event.key === 'Backspace' && !text && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const query = text.trim().toLowerCase();
  const remaining = suggestions.filter((s) => !lower.has(s.toLowerCase()) && (!query || s.toLowerCase().includes(query)));

  return (
    <div className="tag-input">
      {label && (
        <div className="field__label-row">
          <label htmlFor={id} className="field__label">
            {label}
          </label>
          <span className="field__counter">
            {value.length} / {max}
          </span>
        </div>
      )}
      <div className="tag-input__box">
        {value.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button type="button" onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>
              <X size={13} />
            </button>
          </span>
        ))}
        <input
          id={id}
          className="tag-input__field"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => text && add(text)}
          placeholder={full ? `That's ${max}, nice` : value.length ? 'Add another…' : placeholder}
          disabled={full}
          maxLength={40}
        />
      </div>
      {remaining.length > 0 && !full && (
        <div className="tag-input__suggestions" aria-label="Suggestions">
          {remaining.slice(0, 18).map((s) => (
            <button key={s} type="button" className="suggestion" onClick={() => add(s)}>
              <Plus size={13} aria-hidden="true" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
