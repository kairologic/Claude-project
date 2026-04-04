/**
 * app/(site)/admin/layout.tsx
 *
 * Admin layout shell — sidebar + responsive content area.
 * Sidebar is 240px fixed on desktop, hamburger drawer on mobile.
 */

import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#F4F5F7', overflow: 'hidden' }}
    >
      <AdminSidebar />

      {/* Main content area — offset by sidebar on desktop, by header on mobile */}
      <main className="admin-main-content" style={{ height: '100%', overflowY: 'auto' }}>
        {children}
      </main>

      {/* Responsive offset for sidebar/header */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .admin-main-content {
          margin-top: 56px;
          margin-left: 0;
        }
        @media (min-width: 768px) {
          .admin-main-content {
            margin-top: 0;
            margin-left: 240px;
          }
        }
      `,
        }}
      />
    </div>
  );
}
