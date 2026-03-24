'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { colors } from '@/lib/design-tokens';
import MarkdownPreview from '@/components/blog/MarkdownPreview';

interface Category {
  id: string;
  name: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  excerpt: string;
  featuredImageUrl: string;
  authorName: string;
  publishedDate: string;
  status: 'published' | 'draft';
}

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const practiceId = params.id as string;
  const postId = params.postId as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<BlogPost>({
    id: '',
    title: '',
    slug: '',
    category: '',
    content: '',
    excerpt: '',
    featuredImageUrl: '',
    authorName: 'KairoLogic',
    publishedDate: new Date().toISOString().split('T')[0],
    status: 'draft',
  });

  useEffect(() => {
    Promise.all([fetchCategories(), fetchPost()]);
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/blog/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }

  async function fetchPost() {
    try {
      const res = await fetch(`/api/blog/posts/${postId}`);
      if (res.ok) {
        const post = await res.json();
        setFormData({
          ...post,
          publishedDate: post.publishedDate.split('T')[0],
        });
      } else {
        alert('Failed to load post');
        router.back();
      }
    } catch (err) {
      console.error('Failed to fetch post:', err);
      alert('Error loading post');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setFormData({ ...formData, title });
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  async function handleSubmit(status: 'draft' | 'published') {
    setSaving(true);
    try {
      const res = await fetch(`/api/blog/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status,
        }),
      });

      if (res.ok) {
        router.push(`/practice/${practiceId}/blog`);
      } else {
        alert('Failed to save post');
      }
    } catch (err) {
      console.error('Failed to save post:', err);
      alert('Error saving post');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/blog/posts/${postId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push(`/practice/${practiceId}/blog`);
      } else {
        alert('Failed to delete post');
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('Error deleting post');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading post...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back Link */}
      <button
        onClick={() => router.back()}
        style={styles.backLink}
      >
        ← Back to posts
      </button>

      <h1 style={styles.title}>Edit Blog Post</h1>

      <div style={styles.editorWrapper}>
        {/* Left Side: Editor */}
        <div style={showPreview ? styles.hiddenSection : styles.editorSection}>
          {/* Title */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleTitleChange}
              style={styles.input}
            />
          </div>

          {/* Slug (Read-only) */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Slug</label>
            <input
              type="text"
              value={formData.slug}
              disabled
              style={{ ...styles.input, background: colors.gray50, color: colors.gray600 }}
            />
          </div>

          {/* Category */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Content (Markdown)</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              style={{ ...styles.textarea, minHeight: 400 }}
            />
          </div>

          {/* Excerpt */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Excerpt <small style={{ color: colors.gray600 }}>(optional)</small>
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              style={{ ...styles.textarea, minHeight: 80 }}
            />
          </div>

          {/* Featured Image */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Featured Image URL</label>
            <input
              type="text"
              name="featuredImageUrl"
              value={formData.featuredImageUrl}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          {/* Author */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Author Name</label>
            <input
              type="text"
              name="authorName"
              value={formData.authorName}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          {/* Published Date */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Published Date</label>
            <input
              type="date"
              name="publishedDate"
              value={formData.publishedDate}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
        </div>

        {/* Right Side: Preview */}
        {showPreview && (
          <div style={styles.previewSection}>
            <MarkdownPreview content={formData.content} />
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div style={styles.actions}>
        <div style={styles.leftActions}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={styles.previewToggleBtn}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>

          {formData.status === 'published' && (
            <button
              onClick={() => handleSubmit('draft')}
              disabled={saving}
              style={{ ...styles.secondaryBtn, color: colors.red }}
            >
              Unpublish
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={saving}
            style={{ ...styles.secondaryBtn, color: colors.red }}
          >
            Delete
          </button>
        </div>

        <div style={styles.actionButtons}>
          <button
            onClick={() => handleSubmit('draft')}
            disabled={saving}
            style={styles.saveDraftBtn}
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={() => handleSubmit('published')}
            disabled={saving}
            style={styles.publishBtn}
            onMouseOver={(e) => (e.currentTarget.style.background = colors.gold)}
            onMouseOut={(e) => (e.currentTarget.style.background = colors.navy)}
          >
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px',
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: colors.blue,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16,
    padding: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.navy,
    margin: '0 0 24px',
  },
  editorWrapper: {
    display: 'flex',
    gap: 20,
  },
  editorSection: {
    flex: 1,
    background: '#fff',
    borderRadius: 8,
    border: `1px solid ${colors.gray200}`,
    padding: 24,
  },
  hiddenSection: {
    display: 'none',
  },
  previewSection: {
    flex: 1,
    background: '#fff',
    borderRadius: 8,
    border: `1px solid ${colors.gray200}`,
    padding: 24,
    maxHeight: '100vh',
    overflowY: 'auto' as const,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: colors.navy,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.gray200}`,
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'inherit',
    color: colors.navy,
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.gray200}`,
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.navy,
    boxSizing: 'border-box' as const,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTop: `1px solid ${colors.gray200}`,
    gap: 16,
  },
  leftActions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  previewToggleBtn: {
    background: colors.gray100,
    color: colors.navy,
    border: `1px solid ${colors.gray200}`,
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  secondaryBtn: {
    background: 'transparent',
    border: `1px solid ${colors.gray200}`,
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionButtons: {
    display: 'flex',
    gap: 12,
  },
  saveDraftBtn: {
    background: colors.gray100,
    color: colors.navy,
    border: `1px solid ${colors.gray200}`,
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  publishBtn: {
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
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: colors.gray600,
  },
};
