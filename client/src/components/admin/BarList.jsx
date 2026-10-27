// Simple accessible horizontal bars: every bar also shows its number as text.
export default function BarList({ items, max }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.total ?? i.value));
  return (
    <ul className="bar-list">
      {items.map((item) => {
        const base = item.total ?? item.value;
        return (
          <li key={item.key || item.label} className="bar-list__item">
            <div className="bar-list__row">
              <span className="bar-list__label">{item.label}</span>
              <span className="bar-list__value">{item.display ?? item.value}</span>
            </div>
            <span className="bar-list__track" aria-hidden="true">
              {item.total !== undefined && <span className="bar-list__bar bar-list__bar--total" style={{ width: `${(base / top) * 100}%` }} />}
              <span className={`bar-list__bar ${item.className || ''}`} style={{ width: `${(item.value / top) * 100}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
