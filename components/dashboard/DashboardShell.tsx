/**
 * components/dashboard/DashboardShell.tsx
 *
 * Client component shell for the dashboard.
 * Combines Sidebar + HeaderBar + scrollable main content.
 * Manages alert badge count via Supabase subscription.
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';
import { colors } from '@/lib/design-tokens';

interface Practice {
  practice_id: string;
  practice_name: string;
  city: string;
  state: string;
  provider_count: number;
}

interface DashboardShellProps {
  children: React.ReactNode;
  practices: Practice[];
  currentPracticeId: string;
  currentPracticeName: string;
  currentProviderCount: number;
  userName: string;
  userRole: string;
  userInitials: string;
}

const pageTitles: Record<string, string> = {
  '': 'Dashboard',
  '/workflows': 'Workflows',
  '/roster': 'Provider roster',
  '/alerts': 'Alerts',
  '/documents': 'Documents',
  '/payer-directory': 'Payer directories',
  '/search': 'Natural Language Search',
  '/reports': 'Reports',
  '/blog': 'Blog Management',
  '/settings': 'Settings',
  '/onboarding': 'Provider onboarding',
  '/release': 'Provider release',
  '/compliance': 'Compliance',
  '/audit': 'Audit trail',
  '/help': 'Help center',  '/requests': 'My Requests',
};

export default function DashboardShell({
  children,
  practices,
  currentPracticeId,
  currentPracticeName,
  currentProviderCount,
  userName,
  userRole,
  userInitials,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [unseenAlertCount, setUnseenAlertCount] = useState(0);

  // Derive page title from pathname
  const basePath = `/practice/${currentPracticeId}`;
  const subPath = pathname.replace(basePath, '') || '';
  const pageTitle = pageTitles[subPath] || 'Dashboard';

  // Fetch unseen alert count
  useEffect(() => {
    async function fetchUnseenCount() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Count alerts for this practice that this user hasn't seen
        const { data: alerts } = await supabase
          .from('alerts')
          .select('id')
          .eq('practice_id', currentPracticeId)
          .eq('is_active', true);

        const { data: reads } = await supabase
          .from('user_alert_reads')
          .select('alert_id')
          .eq('user_id', user.id);

        const readIds = new Set((reads || []).map(r => r.alert_id));
        const unseen = (alerts || []).filter(a => !readIds.has(a.id));
        setUnseenAlertCount(unseen.length);
      } catch (err) {
        console.error('Failed to fetch unseen alerts:', err);
      }
    }

    fetchUnseenCount();
  }, [currentPracticeId, pathname]);

  return (
    <div style={styles.shell}>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <Sidebar
        practices={practices}
        currentPracticeId={currentPracticeId}
        userName={userName}
        userRole={userRole}
        userInitials={userInitials}
        unseenAlertCount={unseenAlertCount}
      />
      <main style={styles.main}>
        <HeaderBar
          title={pageTitle}
          practiceName={currentPracticeName}
          providerCount={currentProviderCount}
          lastSync="2 hours ago"
          practiceId={currentPracticeId}
        />
        <div style={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    display: 'flex',
    height: '100vh',
    background: colors.gray50,
    color: colors.navy,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    padding: 20,
    flex: 1,
  },
};
