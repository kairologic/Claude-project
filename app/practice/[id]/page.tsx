/**
 * app/practice/[id]/page.tsx
 *
 * Dashboard home page — the 5-second view.
 * Phase 3A: placeholder with layout verification.
 * Phase 3B: will add KPIs, workflows, alerts, payer sync.
 */

export default function DashboardHomePage() {
  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0F1E2E 0%, #1A3249 100%)',
        borderRadius: 12, padding: '24px', color: '#fff', marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
          Practice Intelligence Dashboard
        </h2>
        <p style={{ fontSize: 13, color: '#8BA3B8', lineHeight: 1.5 }}>
          Layout shell is live. KPIs, workflow cards, alerts, and payer sync coming in Phase 3B.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Workflows', desc: 'Phase 3B' },
          { label: 'Provider Roster', desc: 'Phase 3E' },
          { label: 'Alerts', desc: 'Phase 3F' },
          { label: 'Documents', desc: 'Phase 3F' },
        ].map(item => (
          <div key={item.label} style={{
            background: '#fff', border: '1px solid #E8EAED', borderRadius: 10,
            padding: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F1E2E', marginBottom: 4 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 11, color: '#9AA3AE' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
