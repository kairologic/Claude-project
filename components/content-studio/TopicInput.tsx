'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Send, RefreshCw } from 'lucide-react';

interface TopicSuggestion {
  topic: string;
  angle: string;
}

interface TopicInputProps {
  onGenerate: (topic: string, audience: string, intent: string, angle: string) => void;
  isGenerating: boolean;
}

export default function TopicInput({ onGenerate, isGenerating }: TopicInputProps) {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('Practice managers & credentialing professionals');
  const [intent, setIntent] = useState<'thought_leadership' | 'educational' | 'product_awareness'>('thought_leadership');
  const [angle, setAngle] = useState('');
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/content-studio/topic-suggestions');
      const data = await res.json();
      if (data.suggestions) setSuggestions(data.suggestions);
    } catch {
      // silent fail
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onGenerate(topic, audience, intent, angle);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Sparkles size={20} className="text-amber-500" />
          New Content
        </h3>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI-Suggested Topics</span>
            <button
              onClick={fetchSuggestions}
              disabled={loadingSuggestions}
              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <RefreshCw size={12} className={loadingSuggestions ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setTopic(s.topic); setAngle(s.angle); }}
                className="text-xs px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors text-left"
                title={s.angle}
              >
                {s.topic}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Why 30% of provider directories have stale data"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Audience</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Intent</label>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value as typeof intent)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
            >
              <option value="thought_leadership">Thought Leadership</option>
              <option value="educational">Educational</option>
              <option value="product_awareness">Product Awareness</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Angle / Hook (optional)</label>
          <input
            type="text"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            placeholder="e.g., Personal story about discovering data mismatches"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isGenerating || !topic.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Researching & Writing...
            </>
          ) : (
            <>
              <Send size={16} />
              Generate Content
            </>
          )}
        </button>
      </form>
    </div>
  );
}
