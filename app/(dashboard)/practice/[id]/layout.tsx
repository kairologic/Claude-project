/**
 * app/practice/[id]/layout.tsx
 *
 * Server component layout for the practice dashboard.
 * Fetches user + practice data, renders sidebar + header,
 * wraps child pages in scrollable main content area.
 */

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-helpers';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default async function PracticeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const practiceId = id;

  // Get authenticated user + practices
  const auth = await getAuthenticatedUser();

  if (!auth) {
    redirect('/sign-in');
  }

  // Verify user has access to this practice
  const practiceAccess = auth.practices?.find((p: any) => p.practice_id === practiceId);

  if (!practiceAccess) {
    // User is authenticated but doesn't have access to this practice
    // Redirect to their primary practice or show an error
    if (auth.primaryPractice) {
      redirect(`/practice/${auth.primaryPractice.practice_id}`);
    }
    redirect('/sign-in?error=no_practice');
  }

  // Build sidebar props
  const practices = (auth.practices || []).map((p: any) => ({
    practice_id: p.practice_id,
    practice_name: p.practice_websites?.name || 'Unknown Practice',
    city: p.practice_websites?.city || '',
    state: p.practice_websites?.state || '',
    provider_count: p.practice_websites?.provider_count || 0,
    last_scan_at: p.practice_websites?.last_scan_at || null,
  }));

  const currentPractice = practices.find((p: any) => p.practice_id === practiceId);
  const rawName = auth.user.user_metadata?.name || auth.user.email?.split('@')[0] || 'User';
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const userRole =
    practiceAccess.role === 'admin'
      ? 'Practice Manager'
      : practiceAccess.role === 'viewer'
        ? 'Viewer'
        : 'Editor';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DashboardShell
      practices={practices}
      currentPracticeId={practiceId}
      currentPracticeName={currentPractice?.practice_name || 'Practice'}
      currentProviderCount={currentPractice?.provider_count || 0}
      lastScanAt={currentPractice?.last_scan_at || null}
      userName={userName}
      userRole={userRole}
      userInitials={initials}
    >
      {children}
    </DashboardShell>
  );
}
