'use client';

import { Skeleton } from '@/components/dashboard/ui';
import { colors, spacing, radii, shadows } from '@/lib/design-tokens';

export default function RosterLoading() {
  return (
    <div style={{ padding: `${spacing.lg}px`, animation: 'fadeIn 0.3s ease-out' }}>
      {/* Summary Bar */}
      <Skeleton
        width="100%"
        height={60}
        radius={radii.lg}
        style={{
          marginBottom: spacing.lg,
          background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray200} 50%, ${colors.gray100} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          boxShadow: shadows.xs,
        }}
      />

      {/* Table Header */}
      <Skeleton
        width="100%"
        height={40}
        radius={radii.md}
        style={{
          marginBottom: spacing.md,
          background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray200} 50%, ${colors.gray100} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }}
      />

      {/* Table Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton
            key={i}
            width="100%"
            height={48}
            radius={radii.md}
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
