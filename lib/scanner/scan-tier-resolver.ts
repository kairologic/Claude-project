// lib/scanner/scan-tier-resolver.ts
// ═══ Scan Tier Resolution ═══
// Maps subscription tiers to scan cadence tiers.
// Used by claim endpoints and subscription upgrades.

export type ScanTier = 'monthly' | 'weekly' | 'daily';

/**
 * Resolve the appropriate scan tier for a given subscription tier.
 * Higher subscription tiers get more frequent scanning.
 */
export function resolveScanTier(subscriptionTier: string | null): ScanTier {
  switch (subscriptionTier) {
    // New pricing tiers
    case 'small':
    case 'medium':
    case 'enterprise':
    case 'trial_protect':
      return 'daily';
    // Legacy tiers
    case 'shield-enterprise':
      return 'daily';
    case 'shield-practice':
    case 'shield-solo':
    case 'safe-harbor':
    case 'report':
    case 'snapshot':
    case 'command':
    case 'protect':
    case 'monitor':
      return 'weekly';
    case 'free':
    default:
      return 'weekly'; // free tier gets weekly scans (Medicare + 2 payers)
  }
}

/**
 * When a practice is claimed (regardless of tier), they get at minimum weekly scans.
 * This ensures claimed practices are never stuck on monthly cadence.
 */
export function resolveScanTierOnClaim(subscriptionTier: string | null): ScanTier {
  const tierFromSub = resolveScanTier(subscriptionTier);
  // Claimed practices get at least weekly — never monthly
  return tierFromSub === 'monthly' ? 'weekly' : tierFromSub;
}
