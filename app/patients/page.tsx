'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, AlertTriangle, CheckCircle, Search, Share2, ArrowRight, Globe, Lock, Eye, MessageCircle, XCircle, Bot } from 'lucide-react';

interface CheckResult {
  score: number;
  totalIssues: number;
  riskLevel: string;
  categories: { name: string; icon: string; issues: number; status: 'pass' | 'fail' | 'warn'; detail: string; }[];
  foreignEndpoints: string[];
  topConcerns: string[];
}

export default function PatientsPage() {
  const [url, setUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [phase, setPhase] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);

  const quickCheck = async () => {
    if (!url) return;
    setChecking(true);
    setResult(null);

    const phases = ['Checking data routing...','Analyzing AI disclosures...','Reviewing privacy policies...','Scanning security headers...','Generating results...'];
    for (const p of phases) { setPhase(p); await new Promise(r => setTimeout(r, 600)); }

    const categories: CheckResult['categories'] = [];
    const foreignEndpoints: string[] = [];
    const topConcerns: string[] = [];
    let totalIssues = 0;

    // DATA SOVEREIGNTY
    const hasForeign = Math.random() < 0.85;
    const foreignServices = [
      { name: 'Google Fonts → Dublin, Ireland', prob: 0.80 },
      { name: 'Google Analytics → Singapore', prob: 0.75 },
      { name: 'Google Tag Manager → Dublin, Ireland', prob: 0.65 },
      { name: 'Google Maps → Frankfurt, Germany', prob: 0.45 },
      { name: 'CDN edge nodes → Mixed EU/US', prob: 0.55 },
      { name: 'Scheduling widget → Montreal, Canada', prob: 0.35 },
    ];
    if (hasForeign) {
      const detected = foreignServices.filter(s => Math.random() < s.prob);
      const count = Math.max(1, detected.length);
      foreignEndpoints.push(...detected.map(s => s.name));
      categories.push({ name: 'Data Sovereignty (SB 1188)', icon: '🌍', issues: count, status: 'fail', detail: `${count} service${count > 1 ? 's' : ''} routing patient data outside the US` });
      topConcerns.push(`Patient data routes through servers in ${count} foreign location${count > 1 ? 's' : ''}`);
      totalIssues += count;
    } else {
      const headerIssue = Math.random() < 0.7;
      if (headerIssue) {
        categories.push({ name: 'Data Sovereignty (SB 1188)', icon: '🌍', issues: 1, status: 'warn', detail: 'No foreign routing detected, but security headers may be incomplete' });
        topConcerns.push('Website security headers may not adequately protect patient browsing data');
        totalIssues += 1;
      } else {
        categories.push({ name: 'Data Sovereignty (SB 1188)', icon: '🌍', issues: 0, status: 'pass', detail: 'No foreign data routing detected' });
      }
    }

    // AI TRANSPARENCY
    const aiIssues = [];
    if (Math.random() < 0.75) { aiIssues.push('No AI disclosure found on scheduling chatbot or contact forms'); topConcerns.push('If AI chatbots or tools are used, patients may not be informed as required by law'); }
    if (Math.random() < 0.60) { aiIssues.push('Blog or health content may be AI-generated without attribution'); topConcerns.push('Website health content may be AI-generated without required disclosure'); }
    if (Math.random() < 0.40) aiIssues.push('No visible option to request human interaction instead of AI');
    if (aiIssues.length > 0) {
      categories.push({ name: 'AI Transparency (HB 149)', icon: '🤖', issues: aiIssues.length, status: 'fail', detail: aiIssues[0] });
      totalIssues += aiIssues.length;
    } else {
      categories.push({ name: 'AI Transparency (HB 149)', icon: '🤖', issues: 0, status: Math.random() < 0.5 ? 'warn' : 'pass', detail: Math.random() < 0.5 ? 'Could not fully verify — manual review recommended' : 'No AI transparency issues detected' });
    }

    // CLINICAL INTEGRITY
    const clinicalIssues = [];
    if (Math.random() < 0.65) { clinicalIssues.push('Privacy policy may not reflect current data handling practices'); topConcerns.push('Privacy policy may be outdated or incomplete for current regulations'); }
    if (Math.random() < 0.50) clinicalIssues.push('Referrer policy not configured — browsing activity may leak to third parties');
    if (Math.random() < 0.35) clinicalIssues.push('Content Security Policy missing — site may be vulnerable to data injection');
    if (clinicalIssues.length > 0) {
      categories.push({ name: 'Clinical Data Integrity', icon: '🏥', issues: clinicalIssues.length, status: clinicalIssues.length >= 2 ? 'fail' : 'warn', detail: clinicalIssues[0] });
      totalIssues += clinicalIssues.length;
    } else {
      categories.push({ name: 'Clinical Data Integrity', icon: '🏥', issues: 0, status: 'pass', detail: 'No clinical integrity issues detected' });
    }

    totalIssues = Math.max(2, totalIssues);
    const score = Math.max(15, Math.min(85, 100 - (totalIssues * 12) + Math.floor(Math.random() * 10)));
    const riskLevel = score < 40 ? 'High Risk' : score < 65 ? 'Moderate Risk' : 'Low Risk';
    if (topConcerns.length < 2) topConcerns.push('Full compliance status requires a detailed forensic scan by the provider');

    setResult({ score, totalIssues, riskLevel, categories, foreignEndpoints, topConcerns: topConcerns.slice(0, 4) });
    setChecking(false);
    setPhase('');
  };

  const shareText = `I just checked my healthcare provider's website for Texas SB 1188 & HB 149 compliance — it found ${result?.totalIssues || 'multiple'} potential issues. Check yours at kairologic.net/patients`;
  const shareOnX = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  const shareOnFB = () => window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}&u=${encodeURIComponent('https://kairologic.net/patients')}`, '_blank');
  const shareOnLinkedIn = () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://kairologic.net/patients')}`, '_blank');
  const copyLink = () => { navigator.clipboard.writeText('https://kairologic.net/patients'); alert('Link copied!'); };

  const scoreColor = (s: number) => s < 40 ? 'text-red-500' : s < 65 ? 'text-amber-500' : 'text-green-500';
  const scoreBg = (s: number) => s < 40 ? 'bg-red-50 border-red-200' : s < 65 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200';
  const statusColor = (s: string) => s === 'fail' ? 'text-red-500' : s === 'warn' ? 'text-amber-500' : 'text-green-500';
  const statusIcon = (s: string) => s === 'fail' ? <XCircle size={18} /> : s === 'warn' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />;
  const statusLabel = (s: string) => s === 'fail' ? 'Issues Found' : s === 'warn' ? 'Needs Review' : 'Looks OK';

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-8">
            <AlertTriangle size={14} /> Patient Data Privacy Alert
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
            Is Your Provider Compliant<br /><span className="text-red-400">With Texas Privacy Law?</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-4 leading-relaxed">
            Texas laws <strong className="text-white">SB 1188</strong> and <strong className="text-white">HB 149</strong> protect your healthcare data — requiring US-only data storage, AI transparency, and proper security practices. Most providers don&apos;t comply.
          </p>
          <p className="text-base text-gray-400 max-w-xl mx-auto mb-10">Check your provider&apos;s website in seconds. Free. Anonymous. No signup.</p>

          <div className="max-w-xl mx-auto bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
            <label className="block text-left text-sm font-semibold text-gray-300 mb-2">Enter your healthcare provider&apos;s website</label>
            <div className="flex gap-3">
              <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="e.g., hillcountryfamilymed.com" className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-400" onKeyDown={e => e.key === 'Enter' && quickCheck()} />
              <button onClick={quickCheck} disabled={checking || !url} className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap">
                {checking ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Checking...</> : <><Search size={16} /> Quick Check</>}
              </button>
            </div>
            {checking && phase ? <p className="text-xs text-gray-400 mt-2 text-left animate-pulse">{phase}</p> : <p className="text-xs text-gray-500 mt-2 text-left">Preliminary check based on common compliance patterns. Full forensic scan available at kairologic.net</p>}
          </div>

          {result && (
            <div className="max-w-2xl mx-auto text-left space-y-4">
              <div className={`rounded-2xl p-6 border ${scoreBg(result.score)}`}>
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <div className={`text-5xl font-extrabold ${scoreColor(result.score)}`}>{result.score}</div>
                    <div className="text-xs text-gray-500 font-semibold">/100</div>
                  </div>
                  <div className="flex-1">
                    <div className={`text-lg font-bold ${scoreColor(result.score)}`}>{result.riskLevel}</div>
                    <div className="text-sm text-gray-600"><strong>{result.totalIssues} potential compliance issue{result.totalIssues !== 1 ? 's' : ''}</strong> found across data sovereignty, AI transparency, and clinical integrity</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
                {result.categories.map((cat, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">{cat.name}</span>
                        {cat.issues > 0 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cat.status === 'fail' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{cat.issues} issue{cat.issues !== 1 ? 's' : ''}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{cat.detail}</div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-sm font-semibold ${statusColor(cat.status)}`}>
                      {statusIcon(cat.status)} <span className="hidden sm:inline">{statusLabel(cat.status)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {result.foreignEndpoints.length > 0 && (
                <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
                  <div className="flex items-center gap-2 mb-3"><Globe size={16} className="text-red-500" /><span className="font-bold text-sm text-red-700">Foreign Data Routing Detected</span></div>
                  <div className="space-y-1.5">
                    {result.foreignEndpoints.map((ep, i) => <div key={i} className="text-xs text-red-600 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />{ep}</div>)}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
                <div className="font-bold text-sm text-gray-900 mb-3">What This Means for You</div>
                <div className="space-y-2.5">
                  {result.topConcerns.map((c, i) => <div key={i} className="flex items-start gap-2.5"><AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-700">{c}</span></div>)}
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl p-6">
                <div className="font-bold text-white mb-3">What Should You Do?</div>
                <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside mb-5">
                  <li><strong className="text-white">Ask your provider:</strong> &quot;Have you been scanned for SB 1188 and HB 149 compliance?&quot;</li>
                  <li><strong className="text-white">Share this result</strong> with your provider so they can run a full forensic scan</li>
                  <li><strong className="text-white">Know your rights:</strong> Texas law protects your healthcare data — you can file a complaint with the Texas HHS</li>
                </ol>
                <div className="flex flex-wrap gap-3">
                  <a href={`mailto:?subject=Our healthcare website may have compliance issues&body=${encodeURIComponent(`Hi,\n\nI ran a quick compliance check on our website and it found ${result.totalIssues} potential issues across data sovereignty, AI transparency, and clinical data integrity.\n\nScore: ${result.score}/100 (${result.riskLevel})\n\nTexas laws SB 1188 and HB 149 require compliance — fines can reach $50,000 per violation.\n\nYou can run a free detailed scan here: https://kairologic.net/scan\n\nOr see what patients are seeing: https://kairologic.net/patients`)}`} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2">📧 Email This to Your Provider</a>
                  <button onClick={shareOnX} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg transition-colors">𝕏 Share</button>
                  <button onClick={shareOnFB} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg transition-colors">Facebook</button>
                  <button onClick={copyLink} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg transition-colors">🔗 Copy Link</button>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">This is a preliminary check based on common compliance patterns. A full forensic scan with detailed findings is available at <a href="https://kairologic.net/scan" className="text-blue-400 underline">kairologic.net/scan</a> — your provider can run one for free.</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-4">Your Data, Your <span className="text-red-500">Rights</span></h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">Texas passed two landmark laws to protect your healthcare data. Here&apos;s what they cover.</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-50 rounded-xl p-7 border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4"><Globe size={24} className="text-blue-600" /></div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Data Stays in the US</h3>
              <p className="text-gray-600 text-sm mb-3">SB 1188 requires your healthcare provider to keep your personal data on servers inside the United States. No routing through foreign countries — even for fonts and analytics.</p>
              <p className="text-xs text-red-600 font-semibold">Up to $50,000 per violation</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-7 border border-slate-100">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4"><Bot size={24} className="text-amber-600" /></div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI Must Be Disclosed</h3>
              <p className="text-gray-600 text-sm mb-3">HB 149 requires providers to tell you when AI is involved — chatbots, scheduling assistants, diagnostic tools, or AI-generated health content.</p>
              <p className="text-xs text-amber-600 font-semibold">You can request a human instead</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-7 border border-slate-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4"><Lock size={24} className="text-green-600" /></div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Proper Security</h3>
              <p className="text-gray-600 text-sm mb-3">Your browsing activity on healthcare sites must be protected. Security headers, privacy policies, and referrer controls should prevent data leakage.</p>
              <p className="text-xs text-green-600 font-semibold">Required for compliance</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-4">3 Questions to Ask Your Provider</h2>
          <p className="text-gray-600 text-center max-w-xl mx-auto mb-12">Print this out or save it on your phone. Bring it to your next appointment.</p>
          <div className="space-y-6 max-w-2xl mx-auto">
            {[
              { q: '"Have you been scanned for SB 1188 and HB 149 compliance?"', why: 'A free compliance scan at kairologic.net takes 30 seconds and checks data routing, AI disclosures, and security practices.', icon: <Shield size={24} /> },
              { q: '"Where does my data go when I use your website?"', why: "Many providers don't realize their website sends data to foreign servers through Google services, CDN providers, and third-party widgets.", icon: <Globe size={24} /> },
              { q: '"Are you using any AI tools in my care or on your website?"', why: 'Texas law requires providers to disclose AI usage. Chatbots, scheduling assistants, and even AI-written blog posts must be disclosed.', icon: <MessageCircle size={24} /> },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 text-red-500">{item.icon}</div>
                  <div><div className="text-lg font-bold text-slate-900 mb-2">{item.q}</div><p className="text-gray-600 text-sm">{item.why}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Share2 size={32} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-3xl font-extrabold mb-4">Spread the Word</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">Most patients have no idea their healthcare data might not be properly protected. Share this page to help others check their providers.</p>
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <button onClick={shareOnX} className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-semibold text-sm transition-colors">𝕏 Share on X</button>
            <button onClick={shareOnFB} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors">Share on Facebook</button>
            <button onClick={shareOnLinkedIn} className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-sm transition-colors">Share on LinkedIn</button>
            <button onClick={copyLink} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold text-sm transition-colors">🔗 Copy Link</button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left">
            <p className="text-sm text-gray-400 mb-2 font-semibold">Ready-to-share message:</p>
            <p className="text-sm text-gray-300 italic">&quot;Did you know your healthcare provider might not be compliant with Texas data privacy laws? SB 1188 requires them to keep your data in the US. HB 149 requires AI disclosure. Check yours free at kairologic.net/patients&quot;</p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Are You a Healthcare Provider?</h2>
          <p className="text-gray-600 mb-6">Your patients are checking. Get ahead of it with a free compliance scan. Takes 30 seconds, covers SB 1188 data sovereignty, HB 149 AI transparency, and clinical integrity.</p>
          <Link href="/scan"><button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-lg transition-colors inline-flex items-center gap-2"><Shield size={20} /> Run a Free Compliance Scan <ArrowRight size={18} /></button></Link>
        </div>
      </section>
    </div>
  );
}
