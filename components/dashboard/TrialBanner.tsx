'use client';

import { useState, useEffect } from 'react';

// ═══ Trial Banner ════════════════════════════════════════
// Shows at the top of the practice dashboard during trial.
// States: active trial countdown, expiring warning, expired upgrade prompt.

interface TrialState {
  plan_tier: string;
  trial_status: string;
  days_remaining: number;
  is_trial: boolean;
  is_paid: boolean;
  is_free: boolean;
}

export function TrialBanner({ trialState, practiceId }: { trialState: TrialState; practiceId: string }) {
  if (trialState.is_paid) return null; // no banner for paying customers

  const upgradeUrl = `/practice/${practiceId}?upgrade=true`;

  // Active trial
  if (trialState.is_trial && trialState.trial_status === 'ACTIVE') {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-400 text-sm font-bold">
              Premium trial active \u2014 {trialState.days_remaining} day{trialState.days_remaining !== 1 ? 's' : ''} remaining
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Full Protect-tier access. Forms, alerts, roster surveillance, and auto-confirmation included.
            </p>
          </div>
          <a href={upgradeUrl} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-4 py-2 rounded-lg text-xs hover:bg-emerald-500/20 transition-colors whitespace-nowrap">
            Keep access \u2014 $99/mo
          </a>
        </div>
      </div>
    );
  }

  // Expiring (2 days or less)
  if (trialState.is_trial && trialState.trial_status === 'EXPIRING') {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-sm font-bold">
              Premium access expires in {trialState.days_remaining} day{trialState.days_remaining !== 1 ? 's' : ''}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Form generation, alerts, and monitoring will be locked after expiry.
            </p>
          </div>
          <a href={upgradeUrl} className="bg-gold text-navy font-bold px-5 py-2 rounded-lg text-sm hover:bg-gold-dark transition-colors whitespace-nowrap">
            Upgrade now \u2014 $99/mo
          </a>
        </div>
      </div>
    );
  }

  // Expired / free tier
  if (trialState.is_free || trialState.trial_status === 'EXPIRED') {
    return (
      <div className="bg-gradient-to-r from-red-500/5 to-red-500/[0.02] border border-red-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-400 text-sm font-bold">
              Trial ended \u2014 premium features locked
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Reactivate to unlock form generation, real-time alerts, and auto-confirmation.
            </p>
          </div>
          <a href={upgradeUrl} className="bg-gold text-navy font-bold px-5 py-2 rounded-lg text-sm hover:bg-gold-dark transition-colors whitespace-nowrap">
            Reactivate \u2014 $99/mo
          </a>
        </div>
      </div>
    );
  }

  return null;
}

// ═══ Upgrade Prompt (Modal) ══════════════════════════════
// Shows when a user clicks a locked feature.

interface UpgradePromptProps {
  feature: string;        // "form generation", "bulk forms", "alert emails"
  requiredTier: string;   // "monitor", "protect", "command"
  practiceId: string;
  onClose: () => void;
}

export function UpgradePrompt({ feature, requiredTier, practiceId, onClose }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trial/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice_website_id: practiceId, plan: requiredTier }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      // fallback
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-light border border-white/[0.08] rounded-2xl p-8 max-w-md w-full"
        onClick={e => e.stopPropagation()}>

        {/* Lock icon */}
        <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" strokeWidth="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" />
          </svg>
        </div>

        <h3 className="text-white font-bold text-lg text-center mb-2">
          Unlock {feature}
        </h3>
        <p className="text-slate-400 text-sm text-center mb-6">
          {feature === 'form generation'
            ? "You've used your free form. Upgrade to generate unlimited NPPES correction forms and get auto-confirmation when updates go live."
            : feature === 'bulk forms'
            ? 'Generate correction forms for all mismatched providers in one download. Save hours of manual NPPES portal work.'
            : feature === 'alert emails'
            ? 'Get real-time email alerts when new mismatches are detected. Never miss a provider record change.'
            : `This feature requires the ${requiredTier} plan.`
          }
        </p>

        {/* Pricing */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-6">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-3xl font-black text-white">$99</span>
            <span className="text-slate-500 text-sm">/month</span>
          </div>
          <p className="text-gold text-xs font-bold text-center">Founder's Rate \u2014 locked for 12 months</p>
          <p className="text-slate-600 text-[10px] text-center mt-1">First 10 customers only</p>

          <div className="mt-4 space-y-2">
            {[
              'Unlimited NPPES correction forms',
              'Bulk form generation',
              'Real-time mismatch alerts',
              'Auto-confirmation monitoring',
              'Roster surveillance',
              'State regulatory compliance scanning',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-300">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleUpgrade} disabled={loading}
          className="w-full bg-gold text-navy font-bold py-3 rounded-lg text-sm hover:bg-gold-dark transition-colors disabled:opacity-50">
          {loading ? 'Redirecting...' : 'Upgrade Now'}
        </button>

        <button onClick={onClose}
          className="w-full text-slate-500 text-xs mt-3 py-2 hover:text-slate-300 transition-colors">
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ═══ Feature-Gated Wrapper ═══════════════════════════════
// Wraps any button/action that requires a paid feature.
// Shows the action normally if allowed, shows upgrade prompt if locked.

interface GatedFeatureProps {
  feature: string;
  allowed: boolean;
  requiredTier?: string;
  practiceId: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function GatedFeature({ feature, allowed, requiredTier, practiceId, children, onClick }: GatedFeatureProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleClick = () => {
    if (allowed) {
      onClick?.();
    } else {
      setShowUpgrade(true);
    }
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>
      {showUpgrade && (
        <UpgradePrompt
          feature={feature}
          requiredTier={requiredTier || 'protect'}
          practiceId={practiceId}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}
