import { Metadata } from 'next';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
import { getPublishedPosts, getCategories, getPostsByCategory } from '@/lib/blog-service';
import BlogHero from '@/components/blog/BlogHero';
import CategoryFilter from '@/components/blog/CategoryFilter';
import BlogGrid from '@/components/blog/BlogGrid';
import { colors } from '@/lib/design-tokens';

interface BlogPageProps {
  searchParams?: {
    category?: string;
  };
}

export const metadata: Metadata = {
  title: 'Insights & Guides | KairoLogic',
  description:
    'Industry insights, guides, and best practices for provider data intelligence and healthcare compliance.',
  openGraph: {
    title: 'Insights & Guides | KairoLogic',
    description: 'Industry insights, guides, and best practices for healthcare compliance.',
  },
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  // Fetch posts and categories
  let posts = await getPublishedPosts();
  const allCategories = await getCategories();

  // Create category map by ID
  const categoryMap: Record<string, (typeof allCategories)[0]> = {};
  allCategories.forEach((cat) => {
    categoryMap[cat.id] = cat;
  });

  // Filter by category if provided
  const activeCategory = searchParams?.category;
  if (activeCategory) {
    const category = allCategories.find((c) => c.slug === activeCategory);
    if (category) {
      posts = await getPostsByCategory(category.id);
    }
  }

  // Separate hero post and grid posts
  const heroPosts = posts.slice(0, 1);
  const gridPosts = posts.slice(1, 10); // Up to 9 posts in grid

  return (
    <div style={{ backgroundColor: colors.white }}>
      {/* Page Header */}
      <div
        style={{
          paddingTop: '80px',
          paddingBottom: '48px',
          borderBottom: `1px solid ${colors.gray200}`,
        }}
      >
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px' }}>
          {/* Tag */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: colors.goldPale,
              color: colors.gold,
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '5px 12px',
              borderRadius: '100px',
              border: `1px solid rgba(212,160,23,0.3)`,
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: colors.gold,
              }}
            ></span>
            Blog
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 600,
              fontFamily: "'Instrument Serif', serif",
              color: colors.navy,
              margin: '16px 0 12px 0',
              lineHeight: 1.2,
            }}
          >
            Insights &amp; Guides
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '18px',
              color: colors.gray600,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Industry insights, best practices, and guides for healthcare compliance and provider data intelligence.
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Featured Post Hero */}
        {heroPosts.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <BlogHero
              post={heroPosts[0]}
              category={
                heroPosts[0].category_id && categoryMap[heroPosts[0].category_id]
                  ? {
                      name: categoryMap[heroPosts[0].category_id].name,
                      slug: categoryMap[heroPosts[0].category_id].slug,
                      color: categoryMap[heroPosts[0].category_id].color,
                    }
                  : undefined
              }
            />
          </div>
        )}

        {/* Category Filter */}
        <CategoryFilter categories={allCategories} activeSlug={activeCategory} />

        {/* Blog Grid */}
        {gridPosts.length > 0 ? (
          <BlogGrid
            posts={gridPosts}
            categories={categoryMap}
            columns={3}
          />
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 24px',
              color: colors.gray600,
            }}
          >
            <p style={{ fontSize: '16px', margin: 0 }}>No posts found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
