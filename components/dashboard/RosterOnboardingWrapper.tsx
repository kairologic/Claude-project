/**
 * components/dashboard/RosterOnboardingWrapper.tsx
 *
 * Client wrapper for RosterOnboardingCard.
 * Handles the confirm/add-provider callbacks and router refresh.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import RosterOnboardingCard from './RosterOnboardingCard';

interface DetectedProvider {
  npi: string;
  provider_name: string | null;
  web_specialty: string | null;
  roster_status: string | null;
  association_source: string | null;
}

interface RosterOnboardingWrapperProps {
  practiceId: string;
  providers: DetectedProvider[];
  onboardingConfirmed: boolean;
}

export default function RosterOnboardingWrapper({
  practiceId,
  providers,
  onboardingConfirmed,
}: RosterOnboardingWrapperProps) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(onboardingConfirmed);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    // Refresh the page to reflect updated provider statuses
    router.refresh();
  }, [router]);

  const handleAddProvider = useCallback(() => {
    // Scroll to top and trigger the add-provider modal via header bar
    // The header bar's "Add Provider" button uses a global event
    window.dispatchEvent(new CustomEvent('kairologic:add-provider'));
  }, []);

  if (confirmed) return null;

  return (
    <RosterOnboardingCard
      practiceId={practiceId}
      providers={providers}
      onboardingConfirmed={confirmed}
      onConfirm={handleConfirm}
      onAddProvider={handleAddProvider}
    />
  );
}
