'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Sparkles, RefreshCw, Linkedin, Unlink, Building2, ChevronDown } from 'lucide-react';
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
  scheduled_at?: string | null;
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
  const [linkedInStatus, setLinkedInStatus] = useState<{
    connected: boolean;
    expired?: boolean;
    name?: string;
    email?: string;
    accounts?: { account_type: string; name: string; email?: string; organization_id?: string; expired: boolean }[];
  }>({ connected: false });
  const [linkedInLoading, setLinkedInLoading] = useState(true);
  const [linkedInAccount, setLinkedInAccount] = useState<'personal' | 'organization'>('personal');
  const [showAccountPicker, setShowAccountPicker] = useState(false);

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

  // Fetch LinkedIn connection status
  const fetchLinkedInStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/linkedin/status');
      const data = await res.json();
      setLinkedInStatus(data);
    } catch {
      // silent
    } finally {
      setLinkedInLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchStats();
    fetchLinkedInStatus();
  }, [fetchPosts, fetchStats, fetchLinkedInStatus]);

  // Handle LinkedIn OAuth redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedinParam = params.get('linkedin');
    const linkedinError = params.get('linkedin_error');
    if (linkedinParam === 'connected' || linkedinParam === 'org_connected') {
      fetchLinkedInStatus();
      if (linkedinParam === 'org_connected') setLinkedInAccount('organization');
      window.history.replaceState({}, '', '/admin/content-studio');
    }
    if (linkedinError) {
      setError(`LinkedIn connection failed: ${linkedinError}`);
      window.history.replaceState({}, '', '/admin/content-studio');
    }
  }, [fetchLinkedInStatus]);

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

  // Schedule post
  const handleSchedule = async (id: string, scheduledAt: string, channels: string[], channelSchedules?: Record<string, string>) => {
    try {
      const res = await fetch(`/api/content-studio/schedule/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: scheduledAt, channels, channel_schedules: channelSchedules }),
      });
      if (res.ok) await fetchPosts();
      else {
        const data = await res.json();
        setError(data.error || 'Failed to schedule post');
      }
    } catch {
      setError('Failed to schedule post');
    }
  };

  // Cancel schedule
  const handleCancelSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/content-studio/schedule/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchPosts();
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
        body: JSON.stringify({ channels, linkedin_account: linkedInAccount }),
      });
      if (res.ok) await fetchPosts();
    } catch {
      // silent
    } finally {
      setIsPublishing(false);
    }
  };

  // Disconnect LinkedIn
  const handleDisconnectLinkedIn = async (accountType?: string) => {
    const label = accountType === 'organization' ? 'KairoLogic company page' : 'your personal LinkedIn';
    if (!confirm(`Disconnect ${label}?`)) return;
    try {
      const url = accountType ? `/api/linkedin/status?type=${accountType}` : '/api/linkedin/status';
      await fetch(url, { method: 'DELETE' });
      await fetchLinkedInStatus();
    } catch {
      // silent
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
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              <h1 className="text-lg font-bold text-slate-800">Content Studio</h1>
              <span className="text-xs text-slate-400 hidden md:inline">Create and publish content across channels</span>
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
            {/* LinkedIn connection status + account picker */}
            {!linkedInLoading && (
              <div className="relative flex items-center gap-2">
                {/* Account picker dropdown */}
                {linkedInStatus.accounts && linkedInStatus.accounts.length > 0 ? (
                  <>
                    <button
                      onClick={() => setShowAccountPicker(!showAccountPicker)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      {linkedInAccount === 'organization' ? <Building2 size={13} /> : <Linkedin size={13} />}
                      <span className="hidden sm:inline">
                        {linkedInAccount === 'organization'
                          ? (linkedInStatus.accounts.find(a => a.account_type === 'organization')?.name || 'KairoLogic')
                          : (linkedInStatus.accounts.find(a => a.account_type === 'personal')?.name || 'Personal')}
                      </span>
                      <ChevronDown size={12} />
                    </button>

                    {/* Dropdown menu */}
                    {showAccountPicker && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Post as</div>
                        {linkedInStatus.accounts.map((account) => (
                          <button
                            key={account.account_type}
                            onClick={() => {
                              setLinkedInAccount(account.account_type as 'personal' | 'organization');
                              setShowAccountPicker(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                              linkedInAccount === account.account_type ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                            }`}
                          >
                            {account.account_type === 'organization' ? <Building2 size={14} /> : <Linkedin size={14} />}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{account.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {account.account_type === 'organization' ? 'Company page' : 'Personal profile'}
                                {account.expired && ' · Expired'}
                              </div>
                            </div>
                            {linkedInAccount === account.account_type && (
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            )}
                          </button>
                        ))}
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          {!linkedInStatus.accounts.find(a => a.account_type === 'personal') && (
                            <a
                              href="/api/linkedin/auth"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Linkedin size={14} />
                              Connect personal profile
                            </a>
                          )}
                          {!linkedInStatus.accounts.find(a => a.account_type === 'organization') && (
                            <a
                              href="/api/linkedin/auth/org"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Building2 size={14} />
                              Connect KairoLogic page
                            </a>
                          )}
                          {linkedInStatus.accounts.map((account) => (
                            <button
                              key={`disconnect-${account.account_type}`}
                              onClick={() => { handleDisconnectLinkedIn(account.account_type); setShowAccountPicker(false); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Unlink size={14} />
                              Disconnect {account.account_type === 'organization' ? 'KairoLogic' : account.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <a
                      href="/api/linkedin/auth"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <Linkedin size={13} />
                      Connect Personal
                    </a>
                    <a
                      href="/api/linkedin/auth/org"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                    >
                      <Building2 size={13} />
                      Connect KairoLogic
                    </a>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => { fetchPosts(); fetchStats(); fetchLinkedInStatus(); }}
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
              onSchedule={handleSchedule}
              onCancelSchedule={handleCancelSchedule}
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
