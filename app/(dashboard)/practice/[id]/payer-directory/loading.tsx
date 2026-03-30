'use client';

import { Skeleton } from '@/components/dashboard/ui';
import { colors, spacing, radii, shadows } from '@/lib/design-tokens';

export default function PayerDirectoryLoading() {
  return (
    <div style={{ padding: `${spacing.lg}px`, animation: 'fadeIn 0.3s ease-out' }}>
      {/* Grid of Skeleton Cells */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: spacing.md,
      }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
          <Skeleton
            key={i}
            width="100%"
            height={150}
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
