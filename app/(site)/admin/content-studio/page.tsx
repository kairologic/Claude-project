'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import TopicInput from '@/components/content-studio/TopicInput';
import PostQueue from '@/components/content-studio/PostQueue';
import PostPreview from '@/components/content-studio/PostPreview';
import PublishHistory from '@/components/content-studio/PublishHistory';

interface Post {
  id: string;
  headline: string;
  body_linkedin?: string;
  body_blog?: string;
  body_substack?: string;
  status: string;
  channels: string[];
  created_at: string;
  content_graphics?: { id: string; graphic_type: string; config: Record<string, unknown>; image_url?: string }[];
  content_publish_log?: { id: string; channel: string; status: string; published_url?: string; error_message?: string; published_at: string }[];
}

interface PipelineStats {
  total_providers?: number;
  total_practices?: number;
  practices_with_mismatches?: number;
  recent_delta_events?: number;
}

export default function ContentStudioPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PipelineStats>({});
  const [batchCount, setBatchCount] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [error, setError] = useState<string>();

  // Auth check
  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
    }
  }, [router]);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/content-studio/posts');
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch pipeline stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/content-studio/pipeline-stats');
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchStats();
  }, [fetchPosts, fetchStats]);

  const selectedPost = posts.find((p) => p.id === selectedPostId) || null;

  // Generate content
  const handleGenerate = async (topic: string, audience: string, intent: string, angle: string) => {
    setIsGenerating(true);
    setError(undefined);
    try {
      const res = await fetch('/api/content-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience, intent, angle }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        await fetchPosts();
        if (data.post?.id) setSelectedPostId(data.post.id);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Batch generate content
  const handleBatchGenerate = async (items: { topic: string; audience: string; intent: string; angle: string }[]) => {
    setIsGenerating(true);
    setError(undefined);
    setBatchTotal(items.length);
    setBatchCount(0);

    let lastPostId: string | undefined;
    for (let i = 0; i < items.length; i++) {
      setBatchCount(i + 1);
      try {
        const res = await fetch('/api/content-studio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(items[i]),
        });
        const data = await res.json();
        if (data.error) {
          setError(`Post ${i + 1} failed: ${data.error}`);
        } else if (data.post?.id) {
          lastPostId = data.post.id;
        }
      } catch (err) {
        setError(`Post ${i + 1} failed: ${(err as Error).message}`);
      }
    }

    await fetchPosts();
    if (lastPostId) setSelectedPostId(lastPostId);
    setIsGenerating(false);
    setBatchCount(0);
    setBatchTotal(0);
  };

  // Update post
  const handleUpdate = async (id: string, updates: Partial<Post>) => {
    try {
      const res = await fetch(`/api/content-studio/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) await fetchPosts();
    } catch {
      // silent
    }
  };

  // Delete post
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await fetch(`/api/content-studio/posts/${id}`, { method: 'DELETE' });
      if (selectedPostId === id) setSelectedPostId(undefined);
      await fetchPosts();
    } catch {
      // silent
    }
  };

  // Publish
  const handlePublish = async (id: string, channels: string[]) => {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/content-studio/publish/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels }),
      });
      if (res.ok) await fetchPosts();
    } catch {
      // silent
    } finally {
      setIsPublishing(false);
    }
  };

  // Capture graphic PNG
  const handleCaptureGraphic = async (graphicId: string, dataUrl: string) => {
    // For MVP, we store the data URL. In production, upload to storage.
    try {
      await fetch(`/api/content-studio/regenerate-graphic/${graphicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { captured_image: dataUrl } }),
      });
    } catch {
      // silent
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              <h1 className="text-lg font-bold text-slate-800">Content Studio</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {stats.total_providers && (
              <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <BarChart3 size={12} />
                  {stats.total_providers} providers
                </span>
                <span>{stats.total_practices} practices</span>
                {stats.practices_with_mismatches != null && (
                  <span className="text-amber-600">{stats.practices_with_mismatches} mismatches</span>
                )}
              </div>
            )}
            <button
              onClick={() => { fetchPosts(); fetchStats(); }}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(undefined)} className="text-red-400 hover:text-red-600 text-xs">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left sidebar: Topic input + Queue */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <TopicInput
              onGenerate={handleGenerate}
              onBatchGenerate={handleBatchGenerate}
              isGenerating={isGenerating}
              generatingCount={batchCount}
              generatingTotal={batchTotal}
            />
            <PostQueue
              posts={posts}
              selectedPostId={selectedPostId}
              onSelect={setSelectedPostId}
              onDelete={handleDelete}
              loading={loading}
            />
          </div>

          {/* Main content: Preview + History */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <PostPreview
              post={selectedPost || null}
              onUpdate={handleUpdate}
              onPublish={handlePublish}
              onCaptureGraphic={handleCaptureGraphic}
              isPublishing={isPublishing}
            />
            {selectedPost?.content_publish_log && selectedPost.content_publish_log.length > 0 && (
              <PublishHistory events={selectedPost.content_publish_log} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
