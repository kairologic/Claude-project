'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Send, RefreshCw, CheckSquare, Square, Zap, Database } from 'lucide-react';

interface TopicSuggestion {
  topic: string;
  angle: string;
}

interface TopicInputProps {
  onGenerate: (topic: string, audience: string, intent: string, angle: string) => void;
  onBatchGenerate: (items: { topic: string; audience: string; intent: string; angle: string }[]) => void;
  isGenerating: boolean;
  generatingCount?: number;
  generatingTotal?: number;
}

export default function TopicInput({ onGenerate, onBatchGenerate, isGenerating, generatingCount, generatingTotal }: TopicInputProps) {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('Practice managers & credentialing professionals');
  const [intent, setIntent] = useState<'thought_leadership' | 'educational' | 'product_awareness'>('thought_leadership');
  const [angle, setAngle] = useState('');
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [category, setCategory] = useState('');
  const [dataDriven, setDataDriven] = useState(false);

  const fetchSuggestions = async (cat?: string, useDataDriven?: boolean) => {
    setLoadingSuggestions(true);
    setSelectedSuggestions(new Set());
    try {
      const params = new URLSearchParams();
      const catVal = (cat ?? category).trim();
      if (catVal) params.set('category', catVal);
      const isDataDriven = useDataDriven ?? dataDriven;
      if (isDataDriven) params.set('mode', 'data_driven');
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/content-studio/topic-suggestions${queryString}`);
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

  const toggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
    }
  };

  const handleSingleClick = (s: TopicSuggestion) => {
    setTopic(s.topic);
    setAngle(s.angle);
    // Clear multi-select when clicking directly
    setSelectedSuggestions(new Set());
  };

  const handleBatchGenerate = () => {
    const items = Array.from(selectedSuggestions).map((i) => ({
      topic: suggestions[i].topic,
      audience,
      intent,
      angle: suggestions[i].angle,
    }));
    onBatchGenerate(items);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onGenerate(topic, audience, intent, angle);
  };

  const hasSelected = selectedSuggestions.size > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Sparkles size={20} className="text-amber-500" />
          New Content
        </h3>
      </div>

      {/* Category input for AI suggestions */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Topic Category</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchSuggestions(); } }}
            placeholder="e.g., Credentialing, Telehealth, Revenue Cycle, NPPES Updates..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
          <button
            onClick={() => fetchSuggestions()}
            disabled={loadingSuggestions || isGenerating}
            className="px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            Suggest
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Enter a category to get targeted AI topic suggestions, or leave blank for general suggestions.</p>
      </div>

      {/* Data-driven toggle */}
      <div className="mb-4">
        <button
          onClick={() => {
            const next = !dataDriven;
            setDataDriven(next);
            fetchSuggestions(undefined, next);
          }}
          disabled={loadingSuggestions || isGenerating}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left text-sm transition-all ${
            dataDriven
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-200'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Database size={15} className={dataDriven ? 'text-indigo-500' : 'text-slate-400'} />
          <div className="flex-1">
            <span className="font-medium">{dataDriven ? 'Data-Driven Mode' : 'Data-Driven Mode'}</span>
            <span className="block text-[10px] mt-0.5 opacity-70">
              {dataDriven
                ? 'Topics grounded in real mismatch rates, state trends, and payer findings'
                : 'Generate topics from KairoLogic\'s provider DB — mismatches, payer data, scan results'}
            </span>
          </div>
          <div className={`w-8 h-4.5 rounded-full transition-colors relative ${dataDriven ? 'bg-indigo-500' : 'bg-slate-300'}`}>
            <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${dataDriven ? 'left-4' : 'left-0.5'}`} />
          </div>
        </button>
      </div>

      {/* AI Suggestions with multi-select */}
      {suggestions.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {dataDriven ? '📊 Data-Driven Topics' : 'AI-Suggested Topics'}
              </span>
              <button
                onClick={selectAll}
                className="text-[10px] text-slate-400 hover:text-amber-600 transition-colors"
              >
                {selectedSuggestions.size === suggestions.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <button
              onClick={() => fetchSuggestions()}
              disabled={loadingSuggestions || isGenerating}
              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <RefreshCw size={12} className={loadingSuggestions ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => {
              const isSelected = selectedSuggestions.has(i);
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <button
                    onClick={() => toggleSuggestion(i)}
                    className="mt-0.5 flex-shrink-0 text-amber-500"
                    disabled={isGenerating}
                  >
                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-300" />}
                  </button>
                  <button
                    onClick={() => handleSingleClick(s)}
                    className="flex-1 text-left"
                    disabled={isGenerating}
                  >
                    <span className="text-xs font-medium text-slate-700 leading-tight">{s.topic}</span>
                    {s.angle && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">{s.angle}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Batch generate button */}
          {hasSelected && (
            <button
              onClick={handleBatchGenerate}
              disabled={isGenerating}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating {generatingCount}/{generatingTotal}...
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Generate {selectedSuggestions.size} Post{selectedSuggestions.size > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!hasSelected && (
          <>
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
          </>
        )}

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

        {!hasSelected && (
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
        )}
      </form>
    </div>
  );
}
