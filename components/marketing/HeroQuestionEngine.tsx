'use client';

import { useEffect, useState, useRef } from 'react';

interface Question {
  id: string;
  question_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  click_count: number;
  is_active: boolean;
}

interface Answer {
  summary: string;
  stat_highlight: {
    value: string;
    label: string;
  };
  gated: boolean;
  followUp?: string;
}

interface HeroStat {
  value: string;
  label: string;
}

interface HeroStatsData {
  total_providers: string;
  total_exclusions: string;
  states_covered: string;
  specialties_indexed: string;
}

export default function HeroQuestionEngine() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [stats, setStats] = useState<HeroStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const answerPanelRef = useRef<HTMLDivElement>(null);

  // 1. On mount: fetch Tier 1 questions + stats
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [questionsRes, statsRes] = await Promise.all([
          fetch('/api/public/hero-questions'),
          fetch('/api/public/hero-stats'),
        ]);

        if (questionsRes.ok) {
          const q = await questionsRes.json();
          setQuestions(Array.isArray(q) ? q : []);
        }

        if (statsRes.ok) {
          const s: HeroStatsData = await statsRes.json();
          setStats([
            { value: s.total_providers, label: 'Providers' },
            { value: s.total_exclusions, label: 'Exclusions' },
            { value: s.states_covered, label: 'States' },
            { value: s.specialties_indexed, label: 'Specialties' },
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };

    fetchInitialData();
  }, []);

  // 2. After initial render: fetch Tier 2 fresh questions (only if not interacted)
  useEffect(() => {
    if (hasInteracted) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/public/hero-questions/fresh');
        if (res.ok) {
          const freshQuestions: Question[] = await res.json();
          if (freshQuestions.length > 0) {
            // Swap 2-3 random chips with fade animation
            const swapCount = Math.min(3, freshQuestions.length);
            setQuestions((prev) => {
              const newQuestions = [...prev];
              for (let i = 0; i < swapCount; i++) {
                const randomIdx = Math.floor(Math.random() * newQuestions.length);
                newQuestions[randomIdx] = {
                  ...freshQuestions[i],
                };
              }
              return newQuestions;
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch fresh questions:', err);
      }
    }, 1000); // 1 second delay for Tier 2

    return () => clearTimeout(timer);
  }, [hasInteracted]);

  const handleQuestionClick = async (question: Question) => {
    setHasInteracted(true);
    setSelectedQuestionId(question.id);
    setSearchInput('');
    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch('/api/public/answer-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.question_text }),
      });

      if (res.ok) {
        const answerData: Answer = await res.json();
        setAnswer(answerData);
        // Scroll answer panel into view
        setTimeout(() => {
          answerPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to fetch answer:', err);
      setAnswer({
        summary: 'Unable to fetch answer. Please try again.',
        stat_highlight: { value: '—', label: 'Error' },
        gated: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasInteracted(true);
    setSelectedQuestionId(null);

    if (!searchInput.trim()) return;

    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch('/api/public/answer-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: searchInput }),
      });

      if (res.ok) {
        const answerData: Answer = await res.json();
        setAnswer(answerData);
        setTimeout(() => {
          answerPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to fetch answer:', err);
      setAnswer({
        summary: 'Unable to fetch answer. Please try again.',
        stat_highlight: { value: '—', label: 'Error' },
        gated: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setHasInteracted(false);
    setSelectedQuestionId(null);
    setAnswer(null);
  };

  const formattedStats = stats.map((s) => ({
    ...s,
    value: parseInt(s.value, 10).toLocaleString(),
  }));

  return (
    <div className="m-hero-question-engine">
      {/* Search bar */}
      <div className="m-hero-search">
        <form onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Ask anything about TX provider data..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !searchInput.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Question chips */}
      <div className="m-hero-chips">
        {questions.map((q) => (
          <button
            key={q.id}
            className={`m-hero-chip ${
              selectedQuestionId === q.id ? 'm-chip-active' : ''
            } ${!selectedQuestionId && Math.random() > 0.7 ? 'm-chip-fresh' : ''}`}
            onClick={() => handleQuestionClick(q)}
            disabled={loading}
          >
            {q.question_text}
          </button>
        ))}
        <button
          className="m-hero-chip-refresh"
          onClick={handleRefresh}
          title="Refresh questions"
          disabled={loading}
        >
          ↻
        </button>
      </div>

      {/* Live stats strip */}
      {formattedStats.length > 0 && (
        <div className="m-hero-live-stats">
          {formattedStats.map((stat, idx) => (
            <div key={idx} className="m-hero-stat-item">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Answer panel (slides down when a question is clicked) */}
      {answer && (
        <div
          ref={answerPanelRef}
          className={`m-hero-answer-panel ${loading ? 'm-answer-loading' : ''}`}
        >
          <div className="m-hero-answer-summary">{answer.summary}</div>

          <div className="m-hero-answer-stat">
            <strong>{answer.stat_highlight.value}</strong>
            <span>{answer.stat_highlight.label}</span>
          </div>

          {answer.gated && (
            <div className="m-hero-gate">
              <p>Sign up free for unlimited access to TX provider intelligence.</p>
              <a href="/signup" className="m-btn-primary m-gold">
                Get Started Free
              </a>
            </div>
          )}

          {!answer.gated && answer.followUp && (
            <div className="m-hero-follow-up">
              <p className="m-follow-up-text">{answer.followUp}</p>
            </div>
          )}
        </div>
      )}

      {loading && !answer && (
        <div className="m-hero-answer-panel m-answer-loading">
          <div className="m-loading-spinner">
            <span></span>
          </div>
        </div>
      )}
    </div>
  );
}
