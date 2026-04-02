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
import { colors, shadows, transitions, radii, spacing, typography } from '@/lib/design-tokens';
import FeedbackModal from './FeedbackModal';

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
  const [feedbackModal, setFeedbackModal] = useState<'issue' | 'feature' | null>(null);

  const currentPractice =
    practices.find((p) => p.practice_id === currentPracticeId) || practices[0];

  // Close dropdowns on outside click and Escape key
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.sidebar-dropdown-area')) {
        setSiteOpen(false);
        setHelpOpen(false);
        setUserOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSiteOpen(false);
        setHelpOpen(false);
        setUserOpen(false);
      }
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', path: '', icon: '◉', label: 'Dashboard' },
    { id: 'workflows', path: '/workflows', icon: '⚡', label: 'Workflows' },
    { id: 'roster', path: '/roster', icon: '👥', label: 'Provider roster' },
    { id: 'alerts', path: '/alerts', icon: '🔔', label: 'Alerts', badge: unseenAlertCount },
    { id: 'documents', path: '/documents', icon: '📄', label: 'Documents' },
    { id: 'payer-directory', path: '/payer-directory', icon: '🏥', label: 'Payer directories' },
    { id: 'search', path: '/search', icon: '🔍', label: 'NL Search' },
    { id: 'reports', path: '/reports', icon: '📊', label: 'Reports' },
    { id: 'blog', path: '/blog', icon: '📝', label: 'Blog' },
    { id: 'settings', path: '/settings', icon: '⚙️', label: 'Settings' },
  ];

  const comingSoon = [{ icon: '🔐', label: 'CAQH ProView Sync' }];

  function getActiveId(): string {
    const basePath = `/practice/${currentPracticeId}`;
    const sub = pathname.replace(basePath, '');
    if (sub === '' || sub === '/') return 'dashboard';
    if (sub.startsWith('/workflows')) return 'workflows';
    if (sub.startsWith('/roster')) return 'roster';
    if (sub.startsWith('/alerts')) return 'alerts';
    if (sub.startsWith('/documents')) return 'documents';
    if (sub.startsWith('/payer-directory')) return 'payer-directory';
    if (sub.startsWith('/search')) return 'search';
    if (sub.startsWith('/reports')) return 'reports';
    if (sub.startsWith('/blog')) return 'blog';
    if (sub.startsWith('/settings')) return 'settings';
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
          onClick={(e) => {
            e.stopPropagation();
            setSiteOpen(!siteOpen);
            setHelpOpen(false);
            setUserOpen(false);
          }}
          aria-expanded={siteOpen}
          style={styles.siteBtn}
        >
          <div style={styles.siteName}>{currentPractice?.practice_name || 'Select practice'}</div>
          <div style={styles.siteMeta}>
            {currentPractice?.city}, {currentPractice?.state} ·{' '}
            {currentPractice?.provider_count || 0} providers
          </div>
          <span style={styles.siteArrow}>▼</span>
        </button>
        {siteOpen && (
          <div style={styles.dropdown} role="menu" aria-label="Practice sites">
            <div style={styles.ddHeader}>Your practice sites</div>
            {practices.map((p) => (
              <button
                key={p.practice_id}
                onClick={() => switchPractice(p.practice_id)}
                role="menuitem"
                aria-current={p.practice_id === currentPracticeId ? 'page' : undefined}
                style={{
                  ...styles.ddItem,
                  background:
                    p.practice_id === currentPracticeId ? `${colors.navy}80` : 'transparent',
                  fontWeight: p.practice_id === currentPracticeId ? 600 : 400,
                }}
              >
                {p.practice_id === currentPracticeId && '✓ '}
                {p.practice_name}
              </button>
            ))}
            <button style={styles.ddAdd} role="menuitem">
              + Add practice site
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={styles.nav} role="navigation" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            aria-current={activeId === item.id ? 'page' : undefined}
            style={{
              ...styles.navItem,
              background: activeId === item.id ? colors.navyMid : 'transparent',
              color: activeId === item.id ? '#fff' : colors.navyLight,
              fontWeight: activeId === item.id ? 700 : 500,
            }}
            onMouseOver={(e) => {
              if (activeId !== item.id)
                (e.currentTarget as HTMLElement).style.background = `${colors.navyMid}80`;
            }}
            onMouseOut={(e) => {
              if (activeId !== item.id)
                (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span style={styles.alertBadge}>{item.badge}</span>
            )}
          </button>
        ))}

        <div style={styles.comingSoonLabel}>Coming soon</div>
        {comingSoon.map((item) => (
          <div key={item.label} style={styles.disabledItem}>
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      {/* Help menu */}
      <div className="sidebar-dropdown-area" style={styles.helpArea}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setHelpOpen(!helpOpen);
            setUserOpen(false);
            setSiteOpen(false);
          }}
          aria-expanded={helpOpen}
          style={styles.helpBtn}
        >
          <span style={styles.helpCircle}>?</span>
          Help &amp; support
        </button>
        {helpOpen && (
          <div style={styles.popupUp} role="menu">
            {[
              { label: 'Help center', action: () => navigate('/help') },
              { label: 'Common questions', action: () => navigate('/help?section=faq') },
              { label: 'Report an issue', action: () => setFeedbackModal('issue') },
              { label: 'Request a feature', action: () => setFeedbackModal('feature') },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  item.action();
                  setHelpOpen(false);
                }}
                role="menuitem"
                style={styles.popupItem}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="sidebar-dropdown-area" style={styles.userArea}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setUserOpen(!userOpen);
            setHelpOpen(false);
            setSiteOpen(false);
          }}
          aria-expanded={userOpen}
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
          <div style={styles.popupUp} role="menu">
            {[
              { label: 'Account settings', path: '/settings' },
              { label: 'Manage team', path: '/settings' },
              { label: 'Reports', path: '/reports' },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  navigate(item.path);
                  setUserOpen(false);
                }}
                role="menuitem"
                style={styles.popupItem}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={async () => {
                const { createBrowserSupabaseClient } = await import('@/lib/auth/auth-client');
                const supabase = createBrowserSupabaseClient();
                await supabase.auth.signOut();
                router.push('/sign-in');
              }}
              role="menuitem"
              style={{
                ...styles.popupItem,
                color: colors.red,
                fontWeight: 600,
                borderBottom: 'none',
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Feedback modal (rendered via portal-like positioning) */}
      {feedbackModal && (
        <FeedbackModal
          type={feedbackModal}
          onClose={() => setFeedbackModal(null)}
          practiceId={currentPracticeId}
          practiceName={currentPractice?.practice_name || ''}
          userName={userName}
        />
      )}
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 224,
    minWidth: 224,
    background: colors.navy,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'relative',
    zIndex: 50,
  },
  logo: {
    padding: `${spacing.lg}px ${spacing.lg}px 14px`,
    ...typography.h2,
    letterSpacing: '-0.02em',
  },
  siteSelector: { padding: `0 ${spacing.sm}px ${spacing.sm}px`, position: 'relative' },
  siteBtn: {
    width: '100%',
    background: colors.navyMid,
    border: 'none',
    borderRadius: radii.md,
    padding: `10px ${spacing.sm}px`,
    cursor: 'pointer',
    textAlign: 'left' as const,
    color: '#fff',
    position: 'relative' as const,
    fontFamily: 'inherit',
    transition: `background ${transitions.fast}`,
  },
  siteName: { ...typography.caption, fontWeight: 700 },
  siteMeta: { fontSize: 10, color: colors.navyLight, marginTop: spacing.xxs },
  siteArrow: {
    position: 'absolute' as const,
    right: spacing.sm,
    top: 14,
    fontSize: 10,
    color: colors.navyLight,
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: spacing.sm,
    right: spacing.sm,
    background: colors.navyMid,
    borderRadius: radii.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
    boxShadow: shadows.xl,
    zIndex: 60,
    animation: `scaleIn 0.15s ease-out`,
  },
  ddHeader: {
    padding: `10px ${spacing.sm}px`,
    borderBottom: '1px solid rgba(139,163,184,.15)',
    ...typography.caption,
    color: colors.navyLight,
  },
  ddItem: {
    width: '100%',
    padding: `${spacing.xs}px ${spacing.sm}px`,
    background: 'none',
    border: 'none',
    color: '#fff',
    ...typography.bodySmall,
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    transition: `background ${transitions.fast}`,
  },
  ddAdd: {
    width: '100%',
    padding: `10px ${spacing.sm}px`,
    background: 'none',
    border: 'none',
    borderTop: '1px solid rgba(139,163,184,.15)',
    color: colors.gold,
    ...typography.caption,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    transition: `background ${transitions.fast}`,
  },
  nav: { flex: 1, padding: `${spacing.xs}px 0` },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    padding: `9px ${spacing.lg}px`,
    border: 'none',
    cursor: 'pointer',
    ...typography.body,
    fontFamily: 'inherit',
    position: 'relative' as const,
    transition: `background ${transitions.fast}`,
  },
  navIcon: { fontSize: 14, width: 20, textAlign: 'center' as const },
  alertBadge: {
    marginLeft: 'auto',
    background: colors.red,
    color: '#fff',
    ...typography.caption,
    padding: `1px 6px`,
    borderRadius: radii.full,
    minWidth: 16,
    textAlign: 'center' as const,
    transition: `all ${transitions.base}`,
  },
  comingSoonLabel: {
    padding: `${spacing.md}px ${spacing.lg}px ${spacing.xs}px`,
    ...typography.label,
    color: 'rgba(139,163,184,.5)',
  },
  disabledItem: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.xs}px ${spacing.lg}px`,
    color: colors.navyLight,
    ...typography.body,
    opacity: 0.45,
  },
  helpArea: { padding: `0 ${spacing.sm}px`, position: 'relative' as const },
  helpBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
    padding: `${spacing.xs}px 6px`,
    background: 'none',
    border: 'none',
    color: colors.navyLight,
    cursor: 'pointer',
    ...typography.bodySmall,
    fontFamily: 'inherit',
    transition: `all ${transitions.fast}`,
  },
  helpCircle: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    border: `1.5px solid ${colors.navyLight}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
  },
  popupUp: {
    position: 'absolute' as const,
    bottom: '100%',
    left: spacing.sm,
    right: spacing.sm,
    background: colors.navyMid,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
    overflow: 'hidden',
    boxShadow: shadows.xl,
    zIndex: 60,
    animation: `scaleIn 0.15s ease-out`,
  },
  popupItem: {
    width: '100%',
    padding: `9px ${spacing.sm}px`,
    background: 'none',
    border: 'none',
    borderBottom: '1px solid rgba(139,163,184,.1)',
    color: '#fff',
    ...typography.caption,
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    transition: `background ${transitions.fast}`,
  },
  userArea: {
    padding: `${spacing.xs}px ${spacing.sm}px 14px`,
    borderTop: '1px solid rgba(139,163,184,.1)',
    position: 'relative' as const,
  },
  userBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    padding: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
    fontFamily: 'inherit',
    transition: `all ${transitions.fast}`,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    background: colors.gold,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800,
    color: colors.navy,
  },
  userInfo: { textAlign: 'left' as const },
  userName: { ...typography.bodySmall, fontWeight: 600 },
  userRoleText: { fontSize: 10, color: colors.navyLight },
  userArrow: { marginLeft: 'auto', fontSize: 10, color: colors.navyLight },
};
