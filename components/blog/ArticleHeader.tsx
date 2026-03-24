'use client';

import { BlogPost } from '@/lib/blog-service';
import { colors } from '@/lib/design-tokens';

interface ArticleHeaderProps {
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

export default function ArticleHeader({ post, category }: ArticleHeaderProps) {
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '32px',
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
      <h1
        style={{
          fontSize: '40px',
          fontWeight: 600,
          fontFamily: "'Instrument Serif', serif",
          color: colors.navy,
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {post.title}
      </h1>

      {/* Meta Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '14px',
          color: colors.gray600,
          paddingTop: '12px',
          borderTop: `1px solid ${colors.gray200}`,
        }}
      >
        <span style={{ fontWeight: 500 }}>{post.author_name}</span>
        <span>•</span>
        <span>{publishedDate}</span>
        <span>•</span>
        <span>{post.reading_time_min} min read</span>
      </div>
    </div>
  );
}
