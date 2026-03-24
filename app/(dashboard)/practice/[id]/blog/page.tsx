'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { colors } from '@/lib/design-tokens';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: 'published' | 'draft';
  publishedDate: string;
  views: number;
}

export default function BlogPage() {
  const router = useRouter();
  const params = useParams();
  const practiceId = params.id as string;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const res = await fetch('/api/blog/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }

  function filteredPosts() {
    if (filter === 'published') return posts.filter(p => p.status === 'published');
    if (filter === 'draft') return posts.filter(p => p.status === 'draft');
    return posts;
  }

  async function handleDelete(postId: string) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/blog/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== postId));
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  }

  async function handleTogglePublish(post: BlogPost) {
    try {
      const newStatus = post.status === 'published' ? 'draft' : 'published';
      const res = await fetch(`/api/blog/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setPosts(posts.map(p =>
          p.id === post.id ? { ...p, status: newStatus } : p
        ));
      }
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
    }
  }

  const data = filteredPosts();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Blog Management</h1>
        <button
          onClick={() => router.push(`/practice/${practiceId}/blog/new`)}
          style={styles.newPostBtn}
          onMouseOver={(e) => (e.currentTarget.style.background = colors.gold)}
          onMouseOut={(e) => (e.currentTarget.style.background = colors.navy)}
        >
          + New Post
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterBar}>
        {(['all', 'published', 'draft'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              ...styles.filterTab,
              background: filter === status ? colors.navy : 'transparent',
              color: filter === status ? '#fff' : colors.gray600,
              borderBottom: filter === status ? `2px solid ${colors.gold}` : '1px solid transparent',
            }}
          >
            {status === 'all' ? 'All Posts' : status === 'published' ? 'Published' : 'Drafts'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={styles.loading}>Loading posts...</div>
      ) : data.length === 0 ? (
        <div style={styles.empty}>No posts found</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={{ ...styles.headerCell, textAlign: 'left' }}>Title</th>
                <th style={styles.headerCell}>Category</th>
                <th style={styles.headerCell}>Status</th>
                <th style={styles.headerCell}>Published Date</th>
                <th style={styles.headerCell}>Views</th>
                <th style={styles.headerCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(post => (
                <tr key={post.id} style={styles.row}>
                  <td style={{ ...styles.cell, textAlign: 'left', fontWeight: 500 }}>
                    {post.title}
                  </td>
                  <td style={styles.cell}>{post.category}</td>
                  <td style={styles.cell}>
                    <span
                      style={{
                        ...styles.badge,
                        background: post.status === 'published' ? colors.greenPale : colors.gray100,
                        color: post.status === 'published' ? colors.green : colors.gray600,
                      }}
                    >
                      {post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style={styles.cell}>
                    {new Date(post.publishedDate).toLocaleDateString()}
                  </td>
                  <td style={styles.cell}>{post.views}</td>
                  <td style={styles.cell}>
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => router.push(`/practice/${practiceId}/blog/${post.id}/edit`)}
                        style={styles.actionBtn}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                        style={styles.actionBtn}
                        title="Preview"
                      >
                        👁
                      </button>
                      <button
                        onClick={() => handleTogglePublish(post)}
                        style={styles.actionBtn}
                        title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {post.status === 'published' ? '🔒' : '🔓'}
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        style={{ ...styles.actionBtn, color: colors.red }}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '0 20px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.navy,
    margin: 0,
  },
  newPostBtn: {
    background: colors.navy,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  filterBar: {
    display: 'flex',
    gap: 24,
    marginBottom: 20,
    borderBottom: `1px solid ${colors.gray200}`,
  },
  filterTab: {
    background: 'transparent',
    border: 'none',
    padding: '12px 0',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tableWrapper: {
    background: '#fff',
    borderRadius: 8,
    border: `1px solid ${colors.gray200}`,
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  headerRow: {
    background: colors.gray50,
    borderBottom: `1px solid ${colors.gray200}`,
  },
  headerCell: {
    padding: '12px 16px',
    textAlign: 'center' as const,
    fontWeight: 600,
    color: colors.gray600,
    fontSize: 12,
  },
  row: {
    borderBottom: `1px solid ${colors.gray200}`,
    transition: 'background 0.1s',
  },
  cell: {
    padding: '14px 16px',
    textAlign: 'center' as const,
    color: colors.navy,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
  actionButtons: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    fontSize: 14,
    cursor: 'pointer',
    padding: 4,
    transition: 'opacity 0.2s',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: colors.gray600,
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: colors.gray600,
    background: colors.gray50,
    borderRadius: 8,
  },
};
