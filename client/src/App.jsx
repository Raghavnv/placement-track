// Placeholder only. feature/admin-ui replaces this with the router, AuthProvider
// and layout described in docs/architecture.md (section "Client routing").
const stages = [
  { key: 'applied', label: 'Applied' },
  { key: 'aptitude', label: 'Aptitude Test' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
];

export default function App() {
  return (
    <main className="container" style={{ paddingBlock: 'var(--space-12)' }}>
      <p className="eyebrow">Scaffold ready</p>
      <h1>PlacementTrack</h1>
      <p className="muted" style={{ maxWidth: '60ch' }}>
        Campus placement drives and application tracking. The UI is built on the design
        tokens in <code>src/styles/tokens.css</code>; see <code>docs/ui-design.md</code>.
      </p>
      <div className="stage-row">
        {stages.map((s) => (
          <span key={s.key} className={`badge badge--${s.key}`}>{s.label}</span>
        ))}
      </div>
    </main>
  );
}
