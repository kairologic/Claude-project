'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/lib/blog-service';
import { colors } from '@/lib/design-tokens';

interface BlogHeroProps {
  post: BlogPost;
  category?: {
    name: string;
    slug: string;
    color: string | null;
  };
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

export default function BlogHero({ post, category }: BlogHeroProps) {
  const categoryColor = category?.color ? getCategoryColor(category.color) : colors.green;
  const categoryBg = category?.color
    ? (() => {
        const bgMap: Record<string, string> = {
          green: colors.greenPale,
          blue: colors.bluePale,
          gold: colors.goldPale,
          navy: '#F0F3F8',
        };
        return bgMap[category.color] || colors.greenPale;
      })()
    : colors.greenPale;

  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px',
          alignItems: 'stretch',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: colors.white,
          border: `1px solid ${colors.gray200}`,
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.boxShadow = '0 12px 40px rgba(15,30,46,0.14), 0 4px 12px rgba(15,30,46,0.06)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.boxShadow = 'none';
        }}
      >
        {/* Hero Image */}
        {post.featured_image_url && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              backgroundColor: colors.gray100,
              overflow: 'hidden',
            }}
          >
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
          </div>
        )}

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '32px',
            justifyContent: 'space-between',
          }}
        >
          {/* Category Tag */}
          {category && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: categoryBg,
                color: categoryColor,
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '6px 14px',
                borderRadius: '100px',
                border: `1px solid ${categoryColor}33`,
                width: 'fit-content',
              }}
            >
              {category.name}
            </div>
          )}

          {/* Title */}
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 600,
              fontFamily: "'Instrument Serif', serif",
              color: colors.navy,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {post.title}
          </h2>

          {/* Excerpt */}
          <p
            style={{
              fontSize: '16px',
              color: colors.gray600,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {post.excerpt}
          </p>

          {/* Read Link */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: colors.navy,
              fontSize: '14px',
              fontWeight: 600,
              marginTop: 'auto',
            }}
          >
            <span>Read article</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2.5 7h9M8 3.5L11.5 7 8 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
