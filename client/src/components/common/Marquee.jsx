// Infinite horizontal scroller. Content is duplicated once; the second copy is hidden from screen readers.
export default function Marquee({ children, reverse = false, speed = 40 }) {
  return (
    <div className={`marquee ${reverse ? 'marquee--reverse' : ''}`} style={{ '--marquee-duration': `${speed}s` }}>
      <div className="marquee__track">
        <div className="marquee__group">{children}</div>
        <div className="marquee__group" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
