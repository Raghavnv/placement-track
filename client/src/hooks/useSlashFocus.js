import { useEffect } from 'react';

// Pressing "/" focuses the given input (like GitHub/YouTube search), unless the user is typing.
export default function useSlashFocus(ref) {
  useEffect(() => {
    const onKey = (event) => {
      const tag = event.target.tagName;
      if (event.key !== '/' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target.isContentEditable) return;
      event.preventDefault();
      ref.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ref]);
}
