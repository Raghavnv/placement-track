// Circular match score. Colour shifts with the score; the number is always shown as text.
export default function MatchRing({ score, size = 56, label = true }) {
  const stroke = size >= 64 ? 6 : 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';
  return (
    <span className={`match-ring match-ring--${tone} ${size >= 80 ? 'match-ring--lg' : ''}`} style={{ width: size, height: size }} title={`${score}% match`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="match-ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="match-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <span className="match-ring__text">
        <strong>{score}</strong>
        {label && <small>% match</small>}
        <span className="sr-only">{label ? '' : '% match'}</span>
      </span>
    </span>
  );
}
