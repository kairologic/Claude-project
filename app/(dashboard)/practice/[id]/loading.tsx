'use client';

import { Skeleton } from '@/components/dashboard/ui';
import { colors, spacing, radii, shadows } from '@/lib/design-tokens';

export default function DashboardLoading() {
  return (
    <div style={{ padding: `${spacing.lg}px`, animation: 'fadeIn 0.3s ease-out' }}>
      {/* KPI Cards Row */}
      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            width="100%"
            height={80}
            radius={radii.lg}
            style={{
              flex: 1,
              background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray200} 50%, ${colors.gray100} 75%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
              boxShadow: shadows.xs,
            }}
          />
        ))}
      </div>

      {/* Two-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
        {/* Left Column: Provider Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              width="100%"
              height={120}
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

        {/* Right Column: Compliance + Payer Sync */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Skeleton
            width="100%"
            height={200}
            radius={radii.lg}
            style={{
              background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray200} 50%, ${colors.gray100} 75%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
              boxShadow: shadows.xs,
            }}
          />
          <Skeleton
            width="100%"
            height={180}
            radius={radii.lg}
            style={{
              background: `linear-gradient(90deg, ${colors.gray100} 25%, ${colors.gray200} 50%, ${colors.gray100} 75%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
              boxShadow: shadows.xs,
            }}
          />
        </div>
      </div>
    </div>
  );
}
