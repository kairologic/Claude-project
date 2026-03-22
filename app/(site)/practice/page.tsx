/**
 * app/practice/page.tsx
 *
 * Redirects authenticated user to their primary practice dashboard.
 */

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-helpers';

export default async function PracticeIndexPage() {
  const auth = await getAuthenticatedUser();

  if (!auth) {
    redirect('/login');
  }

  if (auth.primaryPractice) {
    redirect(`/practice/${auth.primaryPractice.practice_id}`);
  }

  // No practices linked — shouldn't happen normally
  redirect('/login?error=no_practice');
}
