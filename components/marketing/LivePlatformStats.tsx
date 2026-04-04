'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ──
interface HeroStat {
  value: number;
  label: string;
}

interface StatsResponse {
  stats: Record<string, HeroStat>;
  cached_at: string;
}

interface DisplayStat {
  key: string;
  value: number;
  displayValue: string;
  label: string;
  icon: string;
  suffix?: string;
}

// ── Animated counter hook ──
function useAnimatedNumber(target: number, duration: number = 1200): number {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    prevTarget.current = target;

    if (target === 0) {
      setCurrent(0);
      return;
    }

    const startTime = performance.now();
    let rafId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(start + (target - start) * eased));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return current;
}

// ── Stat card component ──
function StatCard({ stat, isLoaded }: { stat: DisplayStat; isLoaded: boolean }) {
  const animatedValue = useAnimatedNumber(stat.value);

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="m-live-stat-card">
      <div className="m-live-stat-icon">{stat.icon}</div>
      <div className="m-live-stat-value">
        {isLoaded ? formatNumber(animatedValue) : '—'}
        {stat.suffix && <span className="m-live-stat-suffix">{stat.suffix}</span>}
      </div>
      <div className="m-live-stat-label">{stat.label}</div>
    </div>
  );
}

// ── Main component ──
const REFRESH_INTERVAL = 60_000; // 60 seconds

const STAT_CONFIG: Array<{
  key: string;
  icon: string;
  shortLabel: string;
  suffix?: string;
}> = [
  { key: 'total_providers_monitored', icon: '👥', shortLabel: 'Providers Monitored' },
  { key: 'tx_providers_scanned', icon: '🔍', shortLabel: 'TX Providers Scanned' },
  { key: 'oig_exclusions_flagged', icon: '⚠️', shortLabel: 'OIG Exclusions Flagged' },
  { key: 'payer_directories_checked', icon: '🏥', shortLabel: 'Payer Directories Checked' },
  { key: 'websites_monitored', icon: '🌐', shortLabel: 'Websites Monitored' },
  { key: 'ai_tools_detected', icon: '🤖', shortLabel: 'AI Tools Detected' },
];

export default function LivePlatformStats() {
  const [stats, setStats] = useState<DisplayStat[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(
    async (isInitial: boolean = false) => {
      try {
        if (!isInitial) setIsRefreshing(true);

        const res = await fetch('/api/public/hero-stats');
        if (!res.ok) throw new Error('Failed to fetch stats');

        const data: StatsResponse = await res.json();

        const displayStats: DisplayStat[] = STAT_CONFIG.map((config) => {
          const stat = data.stats[config.key];
          return {
            key: config.key,
            value: stat?.value ?? 0,
            displayValue: '',
            label: config.shortLabel,
            icon: config.icon,
            suffix: config.suffix,
          };
        });

        setStats(displayStats);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setIsLoaded(true);
      } catch (err) {
        console.error('[LivePlatformStats] Failed to fetch:', err);
        // On error, show fallback static stats
        if (!isLoaded) {
          setStats(
            STAT_CONFIG.map((config) => ({
              key: config.key,
              value: 0,
              displayValue: '—',
              label: config.shortLabel,
              icon: config.icon,
              suffix: config.suffix,
            })),
          );
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [isLoaded],
  );

  // Initial fetch
  useEffect(() => {
    fetchStats(true);
  }, [fetchStats]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => fetchStats(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <section className="m-section m-live-stats-section">
      <div className="m-container">
        <div className="m-section-header">
          <span className="m-tag m-tag-green">
            <span className="m-live-pulse" aria-hidden="true" />
            Live Platform Data
          </span>
          <h2>
            Real numbers. <em>Real-time.</em>
          </h2>
          <p>
            Our platform continuously scans and cross-references provider data across multiple
            sources. These numbers update live from our database.
          </p>
        </div>

        <div className="m-live-stats-grid">
          {stats.map((stat) => (
            <StatCard key={stat.key} stat={stat} isLoaded={isLoaded} />
          ))}
        </div>

        <div className="m-live-stats-footer">
          <span className="m-live-stats-updated">
            {isRefreshing && <span className="m-live-stats-spinner" aria-hidden="true" />}
            {lastUpdated ? `Last refreshed at ${lastUpdated}` : 'Loading...'}
            {' · '}
            Refreshes every 60s
          </span>
        </div>
      </div>
    </section>
  );
}
