/**
 * components/dashboard/HeaderBar.tsx
 *
 * Sticky header bar at top of main content area.
 * Shows: page title, practice context, date, add provider button, system status.
 */

'use client';

import { useState, useEffect } from 'react';
import { colors } from '@/lib/design-tokens';

interface HeaderBarProps {
  title: string;
  practiceName: string;
  providerCount: number;
  lastSync?: string;
}

export default function HeaderBar({ title, practiceName, providerCount, lastSync }: HeaderBarProps) {
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const now = new Date();
    setDateStr(now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }));
  }, []);

  return (
    <div style={styles.bar}>
      <div>
        <div style={styles.title}>{title}</div>
        <div style={styles.meta}>
          {practiceName} · {providerCount} providers{lastSync ? ` · Last sync: ${lastSync}` : ''}
        </div>
      </div>
      <div style={styles.right}>
        <span style={styles.date}>{dateStr}</span>
        <button style={styles.addBtn}>
          <span style={{ fontSize: 14 }}>+</span> Add provider
        </button>
        <div style={styles.status}>
          <div style={styles.statusDot} />
          <span style={styles.statusText}>Operational</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    padding: '14px 20px', borderBottom: `1px solid ${colors.gray200}`, background: '#fff',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 800, color: colors.navy },
  meta: { fontSize: 11, color: colors.gray400 },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  date: {
    fontSize: 12, fontWeight: 500, color: colors.gray600,
    paddingRight: 4, borderRight: `1px solid ${colors.gray200}`,
  },
  addBtn: {
    background: colors.navy, color: '#fff', border: 'none', borderRadius: 8,
    padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
  },
  status: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: colors.green },
  statusDot: { width: 7, height: 7, borderRadius: '50%', background: colors.green },
  statusText: { fontWeight: 600 },
};
