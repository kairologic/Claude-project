/**
 * components/admin/AdminSidebar.tsx
 *
 * Collapsible admin sidebar with:
 * - KairoLogic branding (split-color logo)
 * - Nav items: Overview, Practices, Content Studio, Alerts, Issues
 * - Mobile hamburger menu with overlay
 * - Active state highlighting, badge counts
 * - Consistent with dashboard design tokens
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  colors,
  shadows,
  transitions,
  radii,
  spacing,
  typography,
  keyframes,
} from '@/lib/design-tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  comingSoon?: boolean;
}

interface AdminSidebarProps {
  alertCount?: number;
  issueCount?: number;
}

// ─── SVG Icons (inline for zero-dep) ─────────────────────────────────────────

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const s = { width: size, height: size, strokeWidth: 1.8, fill: 'none', stroke: 'currentColor' };
  const paths: Record<string, JSX.Element> = {
    home: (
      <svg {...s} viewBox="0 0 24 24">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    building: (
      <svg {...s} viewBox="0 0 24 24">
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    pencil: (
      <svg {...s} viewBox="0 0 24 24">
        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    bell: (
      <svg {...s} viewBox="0 0 24 24">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    flag: (
      <svg {...s} viewBox="0 0 24 24">
        <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
    menu: (
      <svg {...s} viewBox="0 0 24 24">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    x: (
      <svg {...s} viewBox="0 0 24 24">
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    logout: (
      <svg {...s} viewBox="0 0 24 24">
        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    shield: (
      <svg {...s} viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  };
  return paths[name] || null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminSidebar({ alertCount = 0, issueCount = 0 }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: 'home', href: '/admin/dashboard' },
    { id: 'practices', label: 'Practices', icon: 'building', href: '/admin/practices' },
    {
      id: 'content-studio',
      label: 'Content Studio',
      icon: 'pencil',
      href: '/admin/content-studio',
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: 'bell',
      href: '/admin/alerts',
      badge: alertCount || undefined,
    },
    {
      id: 'issues',
      label: 'Issues & Requests',
      icon: 'flag',
      href: '/admin/issues',
      badge: issueCount || undefined,
    },
  ];

  function isActive(href: string) {
    if (href === '/admin/dashboard') return pathname === '/admin/dashboard';
    return pathname.startsWith(href);
  }

  // ─── Sidebar content (shared between desktop & mobile) ───────────────────

  const sidebarContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.navy,
        color: colors.white,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: `${spacing.lg}px ${spacing.lg}px ${spacing.md}px`,
          borderBottom: `1px solid ${colors.navyMid}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: radii.md,
              background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.goldLight} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...typography.h4,
              color: colors.navy,
              fontWeight: 800,
            }}
          >
            K
          </div>
          <div>
            <div style={{ ...typography.h4, color: colors.white, letterSpacing: '0.02em' }}>
              <span style={{ color: colors.gold }}>Kairo</span>Logic
            </div>
            <div style={{ ...typography.caption, color: colors.navyLight, marginTop: -1 }}>
              Admin Console
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        role="navigation"
        aria-label="Admin navigation"
        style={{
          flex: 1,
          padding: `${spacing.md}px ${spacing.sm}px`,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            ...typography.label,
            color: colors.navyLight,
            padding: `${spacing.xs}px ${spacing.sm}px`,
            marginBottom: spacing.xs,
          }}
        >
          Navigation
        </div>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.id}
              role="menuitem"
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (item.comingSoon) return;
                router.push(item.href);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                width: '100%',
                padding: `${spacing.sm}px ${spacing.md}px`,
                borderRadius: radii.md,
                border: 'none',
                cursor: item.comingSoon ? 'default' : 'pointer',
                background: active ? 'rgba(212,160,23,0.15)' : 'transparent',
                color: active
                  ? colors.gold
                  : item.comingSoon
                    ? colors.navyLight
                    : 'rgba(255,255,255,0.8)',
                transition: `all ${transitions.fast}`,
                marginBottom: spacing.xxs,
                opacity: item.comingSoon ? 0.5 : 1,
                textAlign: 'left',
                ...typography.body,
              }}
              onMouseOver={(e) => {
                if (!active && !item.comingSoon) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                }
              }}
              onMouseOut={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <Icon name={item.icon} size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span
                  style={{
                    ...typography.caption,
                    fontWeight: 700,
                    background: colors.red,
                    color: colors.white,
                    borderRadius: radii.full,
                    minWidth: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: `0 ${spacing.xs}px`,
                  }}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {item.comingSoon && (
                <span
                  style={{
                    ...typography.caption,
                    fontSize: 9,
                    color: colors.navyLight,
                    padding: `1px ${spacing.xs}px`,
                    borderRadius: radii.full,
                    border: `1px solid ${colors.navyMid}`,
                  }}
                >
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: `${spacing.md}px ${spacing.lg}px`,
          borderTop: `1px solid ${colors.navyMid}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.sm,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: radii.full,
              background: colors.navyMid,
              color: colors.navyLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...typography.caption,
              fontWeight: 700,
            }}
          >
            <Icon name="shield" size={14} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...typography.caption, color: 'rgba(255,255,255,0.8)' }}>Admin</div>
          </div>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem('admin_auth');
            router.push('/admin');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            width: '100%',
            padding: `${spacing.xs}px ${spacing.sm}px`,
            borderRadius: radii.md,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: colors.navyLight,
            transition: `all ${transitions.fast}`,
            ...typography.bodySmall,
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.color = colors.red;
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.color = colors.navyLight;
          }}
        >
          <Icon name="logout" size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `${keyframes.slideInLeft} ${keyframes.fadeIn}` }} />

      {/* Desktop sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 240,
          zIndex: 40,
          boxShadow: shadows.lg,
          display: 'none',
        }}
        className="admin-sidebar-desktop"
      >
        {sidebarContent}
      </aside>

      {/* Mobile header bar */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          zIndex: 40,
          background: colors.navy,
          color: colors.white,
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${spacing.lg}px`,
          boxShadow: shadows.md,
        }}
        className="admin-mobile-header"
      >
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.white,
            cursor: 'pointer',
            padding: spacing.xs,
            borderRadius: radii.md,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Open menu"
        >
          <Icon name="menu" size={22} />
        </button>
        <div style={{ marginLeft: spacing.sm, ...typography.h4 }}>
          <span style={{ color: colors.gold }}>Kairo</span>Logic
          <span style={{ color: colors.navyLight, marginLeft: spacing.xs, ...typography.caption }}>
            Admin
          </span>
        </div>
      </header>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            animation: 'fadeIn 200ms ease',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              animation: 'slideInLeft 250ms ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'absolute',
                top: spacing.md,
                right: spacing.md,
                background: 'transparent',
                border: 'none',
                color: colors.navyLight,
                cursor: 'pointer',
                zIndex: 51,
                padding: spacing.xs,
                borderRadius: radii.md,
              }}
              aria-label="Close menu"
            >
              <Icon name="x" size={20} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Responsive CSS (media queries can't be inline) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .admin-sidebar-desktop { display: none !important; }
        .admin-mobile-header { display: flex !important; }
        @media (min-width: 768px) {
          .admin-sidebar-desktop { display: block !important; }
          .admin-mobile-header { display: none !important; }
        }
      `,
        }}
      />
    </>
  );
}
