'use client';

import React, { useState } from 'react';
import { Copy, Check, Linkedin, Globe, Mail, Send, Loader2, Image, Clock, Calendar, X } from 'lucide-react';
import ChannelSelector from './ChannelSelector';
import GraphicPreview from './GraphicPreview';

interface PostData {
  id: string;
  headline: string;
  body_linkedin?: string;
  body_blog?: string;
  body_substack?: string;
  status: string;
  channels: string[];
  scheduled_at?: string | null;
  content_graphics?: GraphicData[];
}

interface GraphicData {
  id: string;
  graphic_type: string;
  config: Record<string, unknown>;
  image_url?: string;
}

interface PostPreviewProps {
  post: PostData | null;
  onUpdate: (id: string, data: Partial<PostData>) => void;
  onPublish: (id: string, channels: string[]) => void;
  onSchedule: (id: string, scheduledAt: string, channels: string[]) => void;
  onCancelSchedule: (id: string) => void;
  onCaptureGraphic: (graphicId: string, dataUrl: string) => void;
  isPublishing: boolean;
}

type PreviewTab = 'linkedin' | 'blog' | 'substack';

function formatScheduleDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

// Get default schedule time: next round 15-minute slot at least 30 min from now
function getDefaultScheduleTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  // Round up to next 15-min
  const mins = now.getMinutes();
  const roundedMins = Math.ceil(mins / 15) * 15;
  now.setMinutes(roundedMins, 0, 0);
  // Format for datetime-local input (YYYY-MM-DDTHH:MM)
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function PostPreview({ post, onUpdate, onPublish, onSchedule, onCancelSchedule, onCaptureGraphic, isPublishing }: PostPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('linkedin');
  const [copied, setCopied] = useState(false);
  const [channels, setChannels] = useState<string[]>(post?.channels || ['linkedin', 'blog']);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(getDefaultScheduleTime());

  if (!post) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-slate-300 mb-2">
          <Image size={48} className="mx-auto" />
        </div>
        <p className="text-sm text-slate-400">Select a post from the queue to preview</p>
      </div>
    );
  }

  const bodyMap: Record<PreviewTab, string | undefined> = {
    linkedin: post.body_linkedin,
    blog: post.body_blog,
    substack: post.body_substack,
  };

  const currentBody = bodyMap[activeTab] || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setEditBody(currentBody);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const field = `body_${activeTab}` as keyof PostData;
    onUpdate(post.id, { [field]: editBody });
    setIsEditing(false);
  };

  const handlePublish = () => {
    onPublish(post.id, channels);
  };

  const handleSchedule = () => {
    const utcDate = new Date(scheduleDate).toISOString();
    onSchedule(post.id, utcDate, channels);
    setShowScheduler(false);
  };

  const isScheduled = post.status === 'scheduled' && post.scheduled_at;

  const tabs: { key: PreviewTab; label: string; icon: React.ReactNode }[] = [
    { key: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={14} /> },
    { key: 'blog', label: 'Blog', icon: <Globe size={14} /> },
    { key: 'substack', label: 'Substack', icon: <Mail size={14} /> },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-800 mb-1">{post.headline}</h3>
        <div className="flex items-center gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setIsEditing(false); }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-amber-100 text-amber-700'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scheduled banner */}
      {isScheduled && (
        <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700 text-xs font-medium">
            <Clock size={13} />
            Scheduled for {formatScheduleDate(post.scheduled_at!)}
          </div>
          <button
            onClick={() => onCancelSchedule(post.id)}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-red-500 transition-colors"
          >
            <X size={12} />
            Cancel
          </button>
        </div>
      )}

      {/* Body preview */}
      <div className="p-5">
        {isEditing ? (
          <div>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-y"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap text-sm leading-relaxed max-h-[300px] overflow-y-auto">
              {currentBody || <span className="text-slate-300 italic">No content for this channel</span>}
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleEdit}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Edit
              </button>
              <span className="text-[10px] text-slate-300 ml-auto">
                {currentBody.length} chars
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Graphic preview */}
      {post.content_graphics && post.content_graphics.length > 0 && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Graphic</h4>
          {post.content_graphics.map((g) => (
            <GraphicPreview key={g.id} graphic={g} onCapture={onCaptureGraphic} />
          ))}
        </div>
      )}

      {/* Schedule picker (expandable) */}
      {showScheduler && (
        <div className="px-5 py-4 border-t border-slate-100 bg-blue-50/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar size={13} />
              Schedule Post
            </h4>
            <button
              onClick={() => setShowScheduler(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Date &amp; Time</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
            </div>
            <button
              onClick={handleSchedule}
              disabled={channels.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <Clock size={14} />
              Schedule
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Posts are checked every 15 minutes. Your post will publish at the next check after the scheduled time.
          </p>
        </div>
      )}

      {/* Publish controls */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
        {post.status === 'published' && (
          <p className="text-[10px] text-emerald-600 font-medium mb-2">Published. Select channels to publish to additional platforms.</p>
        )}
        <div className="flex items-center justify-between">
          <ChannelSelector selected={channels} onChange={setChannels} />
          <div className="flex items-center gap-2">
            {/* Schedule button — only show for draft/unpublished posts */}
            {post.status !== 'published' && !isScheduled && (
              <button
                onClick={() => setShowScheduler(!showScheduler)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                <Clock size={14} />
                Schedule
              </button>
            )}
            {/* Publish now button */}
            <button
              onClick={handlePublish}
              disabled={isPublishing || channels.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPublishing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {post.status === 'published' ? 'Publish to Selected' : 'Publish Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
