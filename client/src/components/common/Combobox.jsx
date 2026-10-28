import { useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';

// Searchable text input with suggestions (ARIA combobox). Free text is allowed.
export default function Combobox({ label, value, onChange, onBlur, options, error, hint, required, placeholder }) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef(null);

  const query = value.trim().toLowerCase();
  const matches = options.filter((o) => o.toLowerCase().includes(query) && o.toLowerCase() !== query).slice(0, 7);
  const showList = open && matches.length > 0;

  const choose = (option) => {
    onChange(option);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event) => {
    if (!showList) {
      if (event.key === 'ArrowDown') setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`field combobox ${error ? 'field--error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>
      <div className="combobox__control">
        <Search size={18} aria-hidden="true" className="combobox__icon" />
        <input
          id={id}
          className="input"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
            onBlur?.();
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="combobox__list">
          {matches.map((option, i) => (
            <li
              key={option}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                clearTimeout(blurTimer.current);
                choose(option);
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="field__hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
