'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/lib/blog-service';
import { colors } from '@/lib/design-tokens';

interface BlogCardProps {
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

export default function BlogCard({ post, category }: BlogCardProps) {
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
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <Link href={`/blog/${post.slug}`}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: colors.white,
          border: `1px solid ${colors.gray200}`,
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          height: '100%',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.transform = 'translateY(-2px)';
          el.style.boxShadow = '0 12px 40px rgba(15,30,46,0.14), 0 4px 12px rgba(15,30,46,0.06)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.transform = 'translateY(0)';
          el.style.boxShadow = 'none';
        }}
      >
        {/* Featured Image */}
        {post.featured_image_url && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '56.25%', // 16:9 aspect ratio
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
            gap: '12px',
            padding: '20px',
            flex: 1,
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
                padding: '5px 12px',
                borderRadius: '100px',
                border: `1px solid ${categoryColor}33`,
                width: 'fit-content',
              }}
            >
              {category.name}
            </div>
          )}

          {/* Title */}
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              fontFamily: "'Instrument Serif', serif",
              color: colors.navy,
              margin: 0,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.title}
          </h3>

          {/* Excerpt */}
          <p
            style={{
              fontSize: '14px',
              color: colors.gray600,
              margin: 0,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              flex: 1,
            }}
          >
            {post.excerpt}
          </p>

          {/* Meta Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '12px',
              color: colors.gray400,
              marginTop: 'auto',
              paddingTop: '12px',
              borderTop: `1px solid ${colors.gray200}`,
            }}
          >
            <span>{publishedDate}</span>
            <span>•</span>
            <span>{post.reading_time_min} min read</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
