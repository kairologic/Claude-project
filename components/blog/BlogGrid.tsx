'use client';

import { BlogPost, BlogCategory } from '@/lib/blog-service';
import BlogCard from './BlogCard';

interface BlogGridProps {
  posts: BlogPost[];
  categories?: Record<string, BlogCategory>;
  columns?: 2 | 3;
}

export default function BlogGrid({ posts, categories, columns = 3 }: BlogGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '24px',
        width: '100%',
      }}
    >
      {posts.map((post) => (
        <BlogCard
          key={post.id}
          post={post}
          category={
            post.category_id && categories && categories[post.category_id]
              ? {
                  name: categories[post.category_id].name,
                  slug: categories[post.category_id].slug,
                  color: categories[post.category_id].color,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
