import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

function FieldShell({ id, label, error, hint, required, className = '', children, aside }) {
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && (
        <div className="field__label-row">
          <label htmlFor={id} className="field__label">
            {label}
            {required && <span className="field__required" aria-hidden="true"> *</span>}
          </label>
          {aside}
        </div>
      )}
      {children}
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

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function TextField({ id, label, error, hint, required, className, prefix, suffix, aside, ...inputProps }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required} className={className} aside={aside}>
      <div
        className={`input-group ${prefix ? 'has-prefix' : ''} ${suffix ? 'has-suffix' : ''}`}
        style={typeof prefix === 'string' ? { '--prefix-chars': prefix.length } : undefined}
      >
        {prefix && <span className="input-group__prefix">{prefix}</span>}
        <input
          id={fieldId}
          className="input"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          required={required}
          {...inputProps}
        />
        {suffix && <span className="input-group__suffix">{suffix}</span>}
      </div>
    </FieldShell>
  );
}

export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      suffix={
        <button
          type="button"
          className="input-group__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  );
}

export function SelectField({ id, label, error, hint, required, className, options, placeholder, ...selectProps }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required} className={className}>
      <select
        id={fieldId}
        className="input select"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        required={required}
        {...selectProps}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function TextareaField({ id, label, error, hint, required, className, maxLength, value, ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  const counter =
    maxLength !== undefined ? (
      <span className={`field__counter ${value.length > maxLength * 0.9 ? 'is-near' : ''}`}>
        {value.length} / {maxLength}
      </span>
    ) : null;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={required} className={className} aside={counter}>
      <textarea
        id={fieldId}
        className="input textarea"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        maxLength={maxLength}
        value={value}
        {...props}
      />
    </FieldShell>
  );
}

// Pill-style radio group, e.g. "All / Full-time / Internship".
export function Segmented({ label, name, value, onChange, options, size = 'md' }) {
  return (
    <div className={`segmented segmented--${size}`} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label key={option.value} className={`segmented__option ${value === option.value ? 'is-active' : ''}`}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

export function Switch({ label, checked, onChange, id }) {
  const autoId = useId();
  const switchId = id || autoId;
  return (
    <label className="switch" htmlFor={switchId}>
      <input id={switchId} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__label">{label}</span>
    </label>
  );
}
