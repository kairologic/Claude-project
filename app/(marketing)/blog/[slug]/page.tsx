import { Metadata } from 'next';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
import { notFound } from 'next/navigation';
import {
  getPostBySlug,
  getRelatedPosts,
  getCategories,
  incrementViewCount,
} from '@/lib/blog-service';
import ArticleHeader from '@/components/blog/ArticleHeader';
import ArticleBody from '@/components/blog/ArticleBody';
import AuthorCard from '@/components/blog/AuthorCard';
import RelatedPosts from '@/components/blog/RelatedPosts';
import { colors } from '@/lib/design-tokens';

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Article Not Found | KairoLogic',
    };
  }

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      ...(post.featured_image_url && {
        images: [{ url: post.featured_image_url, width: 1200, height: 630 }],
      }),
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  // Fetch post
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  // Increment view count
  await incrementViewCount(post.id);

  // Fetch categories and related posts
  const allCategories = await getCategories();
  const relatedPostsList = await getRelatedPosts(post.id, post.category_id, 3);

  // Create category map
  const categoryMap: Record<string, (typeof allCategories)[0]> = {};
  allCategories.forEach((cat) => {
    categoryMap[cat.id] = cat;
  });

  const postCategory =
    post.category_id && categoryMap[post.category_id]
      ? {
          name: categoryMap[post.category_id].name,
          slug: categoryMap[post.category_id].slug,
          color: categoryMap[post.category_id].color,
        }
      : undefined;

  return (
    <div style={{ backgroundColor: colors.white }}>
      {/* Article Content */}
      <div
        className="blog-article-grid"
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '80px 24px 60px 24px',
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: '48px',
        }}
      >
        {/* Article Column */}
        <article
          style={{
            maxWidth: '720px',
          }}
        >
          {/* Header */}
          <ArticleHeader post={post} category={postCategory} />

          {/* Featured Image */}
          {post.featured_image_url && (
            <div
              style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%', // 16:9
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: colors.gray100,
                marginBottom: '40px',
              }}
            >
              <img
                src={post.featured_image_url}
                alt={post.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
              />
            </div>
          )}

          {/* Body */}
          <ArticleBody content={post.content} />

          {/* Author Card */}
          <AuthorCard
            name={post.author_name || 'KairoLogic Team'}
            avatar_url={post.author_avatar_url}
            bio="Building the future of provider data intelligence."
          />
        </article>

        {/* Sidebar */}
        <aside style={{ height: 'fit-content' }}>
          {relatedPostsList.length > 0 && <RelatedPosts posts={relatedPostsList} />}
        </aside>
      </div>
    </div>
  );
}
