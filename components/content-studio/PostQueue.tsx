'use client';

import React from 'react';
import { Clock, CheckCircle, Send, AlertCircle, FileText, Eye, Trash2 } from 'lucide-react';

interface Post {
  id: string;
  headline: string;
  status: string;
  channels: string[];
  created_at: string;
  scheduled_at?: string | null;
  content_graphics?: { id: string; graphic_type: string }[];
}

interface PostQueueProps {
  posts: Post[];
  selectedPostId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  draft: { icon: <FileText size={12} />, color: 'text-slate-500 bg-slate-100', label: 'Draft' },
  review: { icon: <Eye size={12} />, color: 'text-amber-600 bg-amber-50', label: 'Review' },
  approved: {
    icon: <CheckCircle size={12} />,
    color: 'text-emerald-600 bg-emerald-50',
    label: 'Approved',
  },
  published: { icon: <Send size={12} />, color: 'text-blue-600 bg-blue-50', label: 'Published' },
  scheduled: { icon: <Clock size={12} />, color: 'text-blue-600 bg-blue-50', label: 'Scheduled' },
  failed: { icon: <AlertCircle size={12} />, color: 'text-red-600 bg-red-50', label: 'Failed' },
};

export default function PostQueue({
  posts,
  selectedPostId,
  onSelect,
  onDelete,
  loading,
}: PostQueueProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock size={16} className="text-slate-500" />
          Content Queue
          <span className="text-xs font-normal text-slate-400">({posts.length})</span>
        </h3>
      </div>

      {posts.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-400">
          No content yet. Generate your first post above.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {posts.map((post) => {
            const sc = statusConfig[post.status] || statusConfig.draft;
            const isSelected = post.id === selectedPostId;
            return (
              <div
                key={post.id}
                onClick={() => onSelect(post.id)}
                className={`px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                  isSelected ? 'bg-amber-50 border-l-2 border-l-amber-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-800 truncate">
                      {post.headline || 'Untitled'}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${sc.color}`}
                      >
                        {sc.icon} {sc.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                      {post.status === 'scheduled' && post.scheduled_at && (
                        <span className="text-[10px] text-blue-500 font-medium">
                          {new Date(post.scheduled_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      {post.channels?.map((ch) => (
                        <span key={ch} className="text-[10px] text-slate-400 capitalize">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(post.id);
                    }}
                    className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
