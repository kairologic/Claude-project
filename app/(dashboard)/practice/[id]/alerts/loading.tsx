'use client';

import { Skeleton } from '@/components/dashboard/ui';
import { colors, spacing, radii, shadows } from '@/lib/design-tokens';

export default function AlertsLoading() {
  return (
    <div style={{ padding: `${spacing.lg}px`, animation: 'fadeIn 0.3s ease-out' }}>
      {/* Summary Line */}
      <Skeleton
        width="100%"
        height={40}
        radius={radii.md}
        style={{
          marginBottom: spacing.lg,
          background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray200} 50%, ${colors.gray100} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }}
      />

      {/* Alert Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {[1, 2, 3, 4].map(i => (
          <Skeleton
            key={i}
            width="100%"
            height={90}
            radius={radii.lg}
            style={{
              background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray200} 50%, ${colors.gray100} 75%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
              boxShadow: shadows.xs,
            }}
          />
        ))}
      </div>
    </div>
  );
}
