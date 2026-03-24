'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/lib/blog-service';
import { colors } from '@/lib/design-tokens';

interface RelatedPostsProps {
  posts: BlogPost[];
}

export default function RelatedPosts({ posts }: RelatedPostsProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: '100px',
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header */}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          fontFamily: "'Instrument Serif', serif",
          color: colors.navy,
          margin: 0,
        }}
      >
        Related Articles
      </h3>

      {/* Related Posts List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {posts.map((post) => {
          const publishedDate = post.published_at
            ? new Date(post.published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '';

          return (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${colors.gray200}`,
                transition: 'all 0.2s ease',
                backgroundColor: colors.white,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.backgroundColor = colors.gray100;
                el.style.borderColor = colors.gray300;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.backgroundColor = colors.white;
                el.style.borderColor = colors.gray200;
              }}
            >
              {/* Small Image */}
              {post.featured_image_url && (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '56.25%', // 16:9
                    borderRadius: '6px',
                    overflow: 'hidden',
                    backgroundColor: colors.gray100,
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

              {/* Title */}
              <h4
                style={{
                  fontSize: '13px',
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
              </h4>

              {/* Date */}
              <p
                style={{
                  fontSize: '11px',
                  color: colors.gray400,
                  margin: 0,
                }}
              >
                {publishedDate}
              </p>
            </Link>
          );
        })}
      </div>

      {/* View All Link */}
      <Link href="/blog" style={{ textDecoration: 'none' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: colors.navy,
            fontSize: '13px',
            fontWeight: 600,
            padding: '8px 0',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.color = colors.blue;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.color = colors.navy;
          }}
        >
          <span>View all articles</span>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path
              d="M2.5 7h9M8 3.5L11.5 7 8 10.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Link>
    </div>
  );
}
