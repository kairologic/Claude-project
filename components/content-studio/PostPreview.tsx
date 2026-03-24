'use client';

import React, { useState, useRef } from 'react';
import { Copy, Check, Download, RefreshCw, Linkedin, Globe, Mail, Send, Loader2, Image } from 'lucide-react';
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
  onCaptureGraphic: (graphicId: string, dataUrl: string) => void;
  isPublishing: boolean;
}

type PreviewTab = 'linkedin' | 'blog' | 'substack';

export default function PostPreview({ post, onUpdate, onPublish, onCaptureGraphic, isPublishing }: PostPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('linkedin');
  const [copied, setCopied] = useState(false);
  const [channels, setChannels] = useState<string[]>(post?.channels || ['linkedin', 'blog']);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState('');

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

      {/* Publish controls */}
      {post.status !== 'published' && (
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <ChannelSelector selected={channels} onChange={setChannels} />
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
              Publish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
