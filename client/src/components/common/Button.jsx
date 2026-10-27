import { forwardRef } from 'react';
import Spinner from './Spinner';

const Button = forwardRef(function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  block = false,
  className = '',
  children,
  disabled,
  type,
  ...props
}, ref) {
  const isButton = Component === 'button';
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', loading && 'is-loading', className]
    .filter(Boolean)
    .join(' ');
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <Component
      ref={ref}
      className={classes}
      {...(isButton ? { type: type || 'button', disabled: disabled || loading } : {})}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : Icon && <Icon size={iconSize} aria-hidden="true" />}
      {children && <span>{children}</span>}
      {IconRight && !loading && <IconRight size={iconSize} aria-hidden="true" />}
    </Component>
  );
});

export default Button;

export function IconButton({ icon: Icon, label, size = 'md', className = '', ...props }) {
  return (
    <button type="button" className={`icon-btn icon-btn--${size} ${className}`} aria-label={label} title={label} {...props}>
      <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" />
    </button>
  );
}
