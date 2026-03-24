'use client';

import Link from 'next/link';
import { BlogCategory } from '@/lib/blog-service';
import { colors } from '@/lib/design-tokens';

interface CategoryFilterProps {
  categories: BlogCategory[];
  activeSlug?: string | null;
}

const getCategoryColor = (colorName: string | null): string => {
  const colorMap: Record<string, string> = {
    green: colors.green,
    blue: colors.blue,
    gold: colors.gold,
    navy: colors.navy,
  };
  return colorMap[colorName || 'navy'] || colors.navy;
};

export default function CategoryFilter({ categories, activeSlug }: CategoryFilterProps) {
  const isAllActive = !activeSlug;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '4px',
        marginBottom: '24px',
      }}
    >
      {/* All Filter */}
      <Link href="/blog" style={{ textDecoration: 'none' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: isAllActive ? colors.navy : colors.gray100,
            color: isAllActive ? colors.white : colors.gray600,
            fontSize: '14px',
            fontWeight: 600,
            padding: '8px 16px',
            borderRadius: '100px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            if (!isAllActive) {
              el.style.backgroundColor = colors.gray200;
            }
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            if (!isAllActive) {
              el.style.backgroundColor = colors.gray100;
            }
          }}
        >
          All
        </div>
      </Link>

      {/* Category Filters */}
      {categories.map((category) => {
        const isActive = activeSlug === category.slug;
        const categoryColor = getCategoryColor(category.color);
        const categoryBg =
          category.color === 'green'
            ? colors.greenPale
            : category.color === 'blue'
              ? colors.bluePale
              : category.color === 'gold'
                ? colors.goldPale
                : '#F0F3F8';

        return (
          <Link
            key={category.id}
            href={`/blog?category=${category.slug}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: isActive ? categoryColor : categoryBg,
                color: isActive ? colors.white : categoryColor,
                fontSize: '14px',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '100px',
                border: `1px solid ${isActive ? categoryColor : `${categoryColor}33`}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (!isActive) {
                  el.style.opacity = '0.8';
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                if (!isActive) {
                  el.style.opacity = '1';
                }
              }}
            >
              {category.name}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
