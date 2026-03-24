'use client';

import React from 'react';
import { CheckCircle, XCircle, Clock, ExternalLink, Linkedin, Globe, Mail } from 'lucide-react';

interface PublishEvent {
  id: string;
  channel: string;
  status: string;
  published_url?: string;
  error_message?: string;
  published_at: string;
}

interface PublishHistoryProps {
  events: PublishEvent[];
}

const channelIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin size={12} />,
  blog: <Globe size={12} />,
  substack: <Mail size={12} />,
};

export default function PublishHistory({ events }: PublishHistoryProps) {
  if (events.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Publish History</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {events.map((evt) => (
          <div key={evt.id} className="px-5 py-3 flex items-center gap-3">
            <div className="flex-shrink-0">
              {evt.status === 'published' ? (
                <CheckCircle size={16} className="text-emerald-500" />
              ) : evt.status === 'failed' ? (
                <XCircle size={16} className="text-red-500" />
              ) : (
                <Clock size={16} className="text-amber-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{channelIcons[evt.channel]}</span>
                <span className="text-sm font-medium text-slate-700 capitalize">{evt.channel}</span>
                <span className="text-xs text-slate-400">
                  {new Date(evt.published_at).toLocaleString()}
                </span>
              </div>
              {evt.error_message && (
                <p className="text-xs text-red-500 mt-0.5">{evt.error_message}</p>
              )}
            </div>
            {evt.published_url && (
              <a
                href={evt.published_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
