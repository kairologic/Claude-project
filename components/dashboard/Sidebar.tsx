/**
 * components/dashboard/Sidebar.tsx
 *
 * Fixed sidebar (224px) with:
 * - Logo (split-color KairoLogic)
 * - Site selector dropdown
 * - Navigation items with active state + alert badge
 * - Coming soon items (dimmed)
 * - Help menu (pops up)
 * - User menu (pops up)
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { colors } from '@/lib/design-tokens';

interface Practice {
  practice_id: string;
  practice_name: string;
  city: string;
  state: string;
  provider_count: number;
}

interface SidebarProps {
  practices: Practice[];
  currentPracticeId: string;
  userName: string;
  userRole: string;
  userInitials: string;
  unseenAlertCount: number;
}

export default function Sidebar({
  practices,
  currentPracticeId,
  userName,
  userRole,
  userInitials,
  unseenAlertCount,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [siteOpen, setSiteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const currentPractice = practices.find(p => p.practice_id === currentPracticeId) || practices[0];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.sidebar-dropdown-area')) {
        setSiteOpen(false);
        setHelpOpen(false);
        setUserOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const navItems = [
    { id: 'dashboard', path: '', icon: '◉', label: 'Dashboard' },
    { id: 'workflows', path: '/workflows', icon: '⚡', label: 'Workflows' },
    { id: 'roster', path: '/roster', icon: '👥', label: 'Provider roster' },
    { id: 'alerts', path: '/alerts', icon: '🔔', label: 'Alerts', badge: unseenAlertCount },
    { id: 'documents', path: '/documents', icon: '📄', label: 'Documents' },
    { id: 'payer-directory', path: '/payer-directory', icon: '🏥', label: 'Payer directories' },
    { id: 'onboarding', path: '/onboarding', icon: '🔐', label: 'Onboarding' },
    { id: 'release', path: '/release', icon: '📤', label: 'Provider release' },
    { id: 'compliance', path: '/compliance', icon: '⚖️', label: 'Compliance' },
    { id: 'audit', path: '/audit', icon: '📋', label: 'Audit trail' },
    { id: 'help', path: '/help', icon: '❓', label: 'Help center' },
  ];

  const comingSoon = [
    { icon: '📊', label: 'Reports' },
    { icon: '⚙️', label: 'Settings' },
  ];

  function getActiveId(): string {
    const basePath = `/practice/${currentPracticeId}`;
    const sub = pathname.replace(basePath, '');
    if (sub === '' || sub === '/') return 'dashboard';
    if (sub.startsWith('/workflows')) return 'workflows';
    if (sub.startsWith('/roster')) return 'roster';
    if (sub.startsWith('/alerts')) return 'alerts';
    if (sub.startsWith('/documents')) return 'documents';
    if (sub.startsWith('/payer-directory')) return 'payer-directory';
    if (sub.startsWith('/onboarding')) return 'onboarding';
    if (sub.startsWith('/release')) return 'release';
    if (sub.startsWith('/compliance')) return 'compliance';
    if (sub.startsWith('/audit')) return 'audit';
    if (sub.startsWith('/help')) return 'help';
    return 'dashboard';
  }

  const activeId = getActiveId();

  function navigate(path: string) {
    router.push(`/practice/${currentPracticeId}${path}`);
    setSiteOpen(false);
    setHelpOpen(false);
    setUserOpen(false);
  }

  function switchPractice(practiceId: string) {
    router.push(`/practice/${practiceId}`);
    setSiteOpen(false);
  }

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <span style={{ color: '#fff' }}>Kairo</span>
        <span style={{ color: colors.gold }}>Logic</span>
      </div>

      {/* Site selector */}
      <div className="sidebar-dropdown-area" style={styles.siteSelector}>
        <button
          onClick={(e) => { e.stopPropagation(); setSiteOpen(!siteOpen); setHelpOpen(false); setUserOpen(false); }}
          style={styles.siteBtn}
        >
          <div style={styles.siteName}>{currentPractice?.practice_name || 'Select practice'}</div>
          <div style={styles.siteMeta}>
            {currentPractice?.city}, {currentPractice?.state} · {currentPractice?.provider_count || 0} providers
          </div>
          <span style={styles.siteArrow}>▼</span>
        </button>
        {siteOpen && (
          <div style={styles.dropdown}>
            <div style={styles.ddHeader}>Your practice sites</div>
            {practices.map(p => (
              <button
                key={p.practice_id}
                onClick={() => switchPractice(p.practice_id)}
                style={{
                  ...styles.ddItem,
                  background: p.practice_id === currentPracticeId ? `${colors.navy}80` : 'transparent',
                  fontWeight: p.practice_id === currentPracticeId ? 600 : 400,
                }}
              >
                {p.practice_id === currentPracticeId && '✓ '}{p.practice_name}
              </button>
            ))}
            <button style={styles.ddAdd}>+ Add practice site</button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              ...styles.navItem,
              background: activeId === item.id ? colors.navyMid : 'transparent',
              color: activeId === item.id ? '#fff' : colors.navyLight,
              fontWeight: activeId === item.id ? 700 : 500,
            }}
            onMouseOver={e => { if (activeId !== item.id) (e.currentTarget as HTMLElement).style.background = `${colors.navyMid}80`; }}
            onMouseOut={e => { if (activeId !== item.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span style={styles.alertBadge}>{item.badge}</span>
            )}
          </button>
        ))}

        <div style={styles.comingSoonLabel}>Coming soon</div>
        {comingSoon.map(item => (
          <div key={item.label} style={styles.disabledItem}>
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      {/* Help menu */}
      <div className="sidebar-dropdown-area" style={styles.helpArea}>
        <button
          onClick={(e) => { e.stopPropagation(); setHelpOpen(!helpOpen); setUserOpen(false); setSiteOpen(false); }}
          style={styles.helpBtn}
        >
          <span style={styles.helpCircle}>?</span>
          Help &amp; support
        </button>
        {helpOpen && (
          <div style={styles.popupUp}>
            {['Help center', 'Common questions', 'Report an issue', 'Request a feature'].map((item, i) => (
              <button key={i} onClick={() => setHelpOpen(false)} style={styles.popupItem}>
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="sidebar-dropdown-area" style={styles.userArea}>
        <button
          onClick={(e) => { e.stopPropagation(); setUserOpen(!userOpen); setHelpOpen(false); setSiteOpen(false); }}
          style={styles.userBtn}
        >
          <div style={styles.userAvatar}>{userInitials}</div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{userName}</div>
            <div style={styles.userRoleText}>{userRole}</div>
          </div>
          <span style={styles.userArrow}>▲</span>
        </button>
        {userOpen && (
          <div style={styles.popupUp}>
            {['Account settings', 'Reset password', 'Manage team', 'Billing'].map((item, i) => (
              <button key={i} onClick={() => setUserOpen(false)} style={styles.popupItem}>
                {item}
              </button>
            ))}
            <button
              onClick={async () => {
                const { createBrowserSupabaseClient } = await import('@/lib/auth/auth-client');
                const supabase = createBrowserSupabaseClient();
                await supabase.auth.signOut();
                router.push('/login');
              }}
              style={{ ...styles.popupItem, color: colors.red, fontWeight: 600, borderBottom: 'none' }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 224, minWidth: 224, background: colors.navy,
    display: 'flex', flexDirection: 'column', height: '100vh',
    position: 'relative', zIndex: 50,
  },
  logo: {
    padding: '18px 18px 14px', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em',
  },
  siteSelector: { padding: '0 12px 12px', position: 'relative' },
  siteBtn: {
    width: '100%', background: colors.navyMid, border: 'none', borderRadius: 8,
    padding: '10px 12px', cursor: 'pointer', textAlign: 'left' as const, color: '#fff',
    position: 'relative' as const, fontFamily: 'inherit',
  },
  siteName: { fontSize: 12, fontWeight: 700 },
  siteMeta: { fontSize: 10, color: colors.navyLight, marginTop: 2 },
  siteArrow: { position: 'absolute' as const, right: 12, top: 14, fontSize: 10, color: colors.navyLight },
  dropdown: {
    position: 'absolute' as const, top: '100%', left: 12, right: 12,
    background: colors.navyMid, borderRadius: 8, marginTop: 4,
    overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,.3)', zIndex: 60,
  },
  ddHeader: {
    padding: '10px 12px', borderBottom: '1px solid rgba(139,163,184,.15)',
    fontSize: 11, color: colors.navyLight,
  },
  ddItem: {
    width: '100%', padding: '8px 12px', background: 'none', border: 'none',
    color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left' as const,
    fontFamily: 'inherit',
  },
  ddAdd: {
    width: '100%', padding: '10px 12px', background: 'none', border: 'none',
    borderTop: '1px solid rgba(139,163,184,.15)', color: colors.gold,
    fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left' as const,
    fontFamily: 'inherit',
  },
  nav: { flex: 1, padding: '8px 0' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 18px',
    border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
    position: 'relative' as const, transition: 'background .1s',
  },
  navIcon: { fontSize: 14, width: 20, textAlign: 'center' as const },
  alertBadge: {
    marginLeft: 'auto', background: colors.red, color: '#fff', fontSize: 9, fontWeight: 700,
    padding: '1px 6px', borderRadius: 100, minWidth: 16, textAlign: 'center' as const,
  },
  comingSoonLabel: {
    padding: '12px 18px 4px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', color: 'rgba(139,163,184,.5)',
  },
  disabledItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px',
    color: colors.navyLight, fontSize: 13, fontWeight: 500, opacity: 0.45,
  },
  helpArea: { padding: '0 12px', position: 'relative' as const },
  helpBtn: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 6px',
    background: 'none', border: 'none', color: colors.navyLight, cursor: 'pointer',
    fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
  },
  helpCircle: {
    width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${colors.navyLight}`,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700,
  },
  popupUp: {
    position: 'absolute' as const, bottom: '100%', left: 12, right: 12,
    background: colors.navyMid, borderRadius: 8, marginBottom: 4,
    overflow: 'hidden', boxShadow: '0 -8px 24px rgba(0,0,0,.3)', zIndex: 60,
  },
  popupItem: {
    width: '100%', padding: '9px 12px', background: 'none', border: 'none',
    borderBottom: '1px solid rgba(139,163,184,.1)', color: '#fff',
    fontSize: 11, fontWeight: 500, cursor: 'pointer', textAlign: 'left' as const,
    fontFamily: 'inherit',
  },
  userArea: {
    padding: '8px 12px 14px', borderTop: '1px solid rgba(139,163,184,.1)',
    position: 'relative' as const,
  },
  userBtn: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 6,
    background: 'none', border: 'none', cursor: 'pointer', color: '#fff',
    fontFamily: 'inherit',
  },
  userAvatar: {
    width: 30, height: 30, borderRadius: '50%', background: colors.gold,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 800, color: colors.navy,
  },
  userInfo: { textAlign: 'left' as const },
  userName: { fontSize: 12, fontWeight: 600 },
  userRoleText: { fontSize: 10, color: colors.navyLight },
  userArrow: { marginLeft: 'auto', fontSize: 10, color: colors.navyLight },
};
