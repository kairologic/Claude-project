/**
 * Seed script: Insert "47 States Healthcare AI Bills" article into Supabase
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/seed-article-47-states.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const contentHtml = `
<div style="position:relative;border-radius:16px;overflow:hidden;margin-bottom:2.5rem;background:#0a0f1a;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(52,211,153,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,0.03) 1px,transparent 1px);background-size:40px 40px;"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#34d399,#059669,#34d399);"></div>
  <div style="position:relative;z-index:10;padding:3rem;">
    <div style="display:flex;gap:1.5rem;margin-bottom:2rem;">
      <div style="padding-left:1rem;border-left:2px solid #34d399;">
        <div style="font-size:1.875rem;font-weight:800;color:#34d399;">47</div>
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#64748b;">States with AI Bills</div>
      </div>
      <div style="padding-left:1rem;border-left:2px solid #fbbf24;">
        <div style="font-size:1.875rem;font-weight:800;color:#fbbf24;">33</div>
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Laws Signed</div>
      </div>
      <div style="padding-left:1rem;border-left:2px solid #f87171;">
        <div style="font-size:1.875rem;font-weight:800;color:#f87171;">0</div>
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Federal AI Laws</div>
      </div>
    </div>
    <h2 style="font-size:1.75rem;font-weight:800;line-height:1.15;color:#f1f5f9;margin-bottom:1rem;letter-spacing:-0.5px;">
      47 States Introduced Healthcare AI Bills.<br><span style="color:#34d399;">Congress Passed Zero.</span>
    </h2>
    <p style="font-size:1.0625rem;color:#94a3b8;line-height:1.5;max-width:560px;">
      How 21 states built their own enforcement frameworks while Washington did nothing, and what it means for every provider in the country.
    </p>
  </div>
  <div style="padding:1rem 3rem;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.04);">
    <span style="font-family:monospace;font-size:0.9375rem;font-weight:700;"><span style="color:#f1f5f9;">Kairo</span><span style="color:#D4A017;">Logic</span></span>
    <span style="font-size:11px;color:#475569;letter-spacing:1px;">SB 1188 · HB 149 · AB 3030 · TRAIGA</span>
  </div>
</div>

<p style="font-size:1.125rem;color:#374151;line-height:1.75;margin-bottom:2rem;font-weight:500;">
  40 million people ask ChatGPT health questions every day. ECRI just named AI chatbot misuse the #1 health technology hazard for 2026. And states are scrambling to figure out what to do about it.
</p>

<p style="color:#374151;line-height:1.75;margin-bottom:2rem;">
  In 2025, <strong style="color:#ea580c;">47 states</strong> introduced more than 250 bills regulating AI in healthcare. 33 were signed into law across 21 states. Congress hasn't passed a single comprehensive AI law, so states are building their own frameworks, each with different scopes, triggers, and penalties.
</p>

<p style="color:#4b5563;line-height:1.75;margin-bottom:2.5rem;">
  I track this closely because I work in this space every day.
</p>

<h2 style="font-size:1.75rem;font-weight:700;color:#0f172a;margin-bottom:1.5rem;">Texas: First Mover, Hard Enforcer</h2>
<p style="color:#374151;line-height:1.75;margin-bottom:1.5rem;">
  Texas went first and went hard. <strong style="color:#0f172a;">SB 1188</strong> requires data sovereignty for patient health information. <strong style="color:#0f172a;">HB 149</strong> and <strong style="color:#0f172a;">TRAIGA</strong> require AI disclosure in diagnosis or treatment, with civil penalties up to <strong style="color:#ea580c;">$200,000 per violation</strong>.
</p>
<p style="color:#374151;line-height:1.75;margin-bottom:1.5rem;">
  And this isn't theoretical. In September 2024, the Texas AG settled with Pieces Technologies, a Dallas AI company marketing clinical documentation tools to four Texas hospitals. Pieces claimed a "severe hallucination rate" of less than 1 in 100,000. The AG found those metrics were likely inaccurate, potentially deceiving hospital staff.
</p>
<div style="background:linear-gradient(to bottom right,rgba(234,88,12,0.05),#fef2f2);border:2px solid rgba(234,88,12,0.2);border-radius:16px;padding:2rem;margin-bottom:2.5rem;">
  <strong style="display:block;color:#0f172a;font-size:1.125rem;margin-bottom:0.5rem;">⚠️ Enforcement Before the Law</strong>
  <p style="color:#374151;line-height:1.75;">
    That case landed <em>before</em> SB 1188 and HB 149 even took effect. The AG used existing consumer protection law. Now imagine enforcement with purpose-built statutes.
  </p>
</div>

<h2 style="font-size:1.75rem;font-weight:700;color:#0f172a;margin-bottom:1.5rem;">California: Disclosure-First</h2>
<p style="color:#374151;line-height:1.75;margin-bottom:2.5rem;">
  California arrived at the same conclusion differently. <strong style="color:#0f172a;">AB 3030</strong> requires providers to disclose when GenAI generates patient communications. <strong style="color:#0f172a;">AB 489</strong> prohibits AI from implying it holds a healthcare license, with penalties up to <strong style="color:#ea580c;">$25,000 per incident</strong>.
</p>

<h2 style="font-size:1.75rem;font-weight:700;color:#0f172a;margin-bottom:1.5rem;">The Growing Patchwork</h2>
<div style="margin-bottom:2.5rem;">
  <div style="border:1px solid #fee2e2;background:#fef2f2;border-radius:16px;padding:1.5rem;margin-bottom:1rem;">
    <strong style="color:#991b1b;">Illinois</strong>
    <p style="font-size:0.875rem;color:#991b1b;">Banned AI from making independent therapeutic decisions entirely</p>
  </div>
  <div style="border:1px solid #e9d5ff;background:#faf5ff;border-radius:16px;padding:1.5rem;margin-bottom:1rem;">
    <strong style="color:#6b21a8;">Colorado</strong>
    <p style="font-size:0.875rem;color:#6b21a8;">Delayed its broad AI act to June 2026</p>
  </div>
  <div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:16px;padding:1.5rem;">
    <strong style="color:#1e40af;">Ohio & Pennsylvania</strong>
    <p style="font-size:0.875rem;color:#1e40af;">Introduced written patient consent requirements for any AI use</p>
  </div>
</div>

<h2 style="font-size:1.75rem;font-weight:700;color:#0f172a;margin-bottom:1.5rem;">The Invisible Compliance Gap</h2>
<p style="color:#374151;line-height:1.75;margin-bottom:1.5rem;">
  Here's what gets missed: while everyone debates AI in clinical decisions, most providers haven't addressed the AI already on their websites. Scheduling chatbots, symptom checkers, AI-powered intake forms — live right now, interacting with patients, with nobody checking whether they comply with the new disclosure laws.
</p>
<p style="color:#374151;line-height:1.75;margin-bottom:2.5rem;">
  I scan healthcare provider websites for exactly this exposure. The pattern is consistent across states. Providers adopt tools without realizing the regulatory obligations. The compliance gap isn't malicious — it's invisible.
</p>

<h2 style="font-size:1.75rem;font-weight:700;color:#0f172a;margin-bottom:1.5rem;">The Federal Void</h2>
<p style="color:#374151;line-height:1.75;margin-bottom:1.5rem;">
  The federal government pushed a December executive order for a "minimally burdensome national standard." But an executive order without legislation doesn't have the teeth to preempt state law.
</p>
<p style="color:#374151;line-height:1.75;margin-bottom:2rem;">
  So where does this leave providers? Operating in a patchwork where Texas, California, Illinois, Colorado, and a growing list of states each have different requirements. Compliance is no longer a single checklist.
</p>

<div style="background:#0f172a;border-radius:16px;padding:2rem;color:white;">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#D4A017;margin-bottom:0.75rem;">Bottom Line</div>
  <p style="font-size:1.125rem;font-weight:700;line-height:1.75;margin-bottom:0.75rem;">
    The organizations that figure this out early won't just avoid penalties. They'll be the ones patients trust.
  </p>
  <p style="font-size:0.875rem;color:#9ca3af;line-height:1.75;">
    We started KairoLogic focused on Texas because enforcement was real and immediate. But the problem applies everywhere this wave is heading. And it's heading everywhere.
  </p>
</div>
`;

async function seed() {
  const { data, error } = await supabase
    .from('blog_posts')
    .upsert({
      slug: '47-states-healthcare-ai-bills',
      title: '47 States Introduced Healthcare AI Bills. Congress Passed Zero.',
      excerpt: "In 2025, 47 states introduced more than 250 bills regulating AI in healthcare. 33 were signed into law across 21 states. Congress hasn't passed a single comprehensive AI law — so states are building their own enforcement frameworks.",
      category: 'AI Regulation',
      statute: 'SB 1188 · HB 149',
      author: 'KairoLogic Compliance Team',
      published_at: '2026-02-24T10:00:00-06:00',
      read_time: '4 min read',
      icon: 'Scale',
      accent_color: 'orange',
      content_html: contentHtml,
      content_status: 'published',
    }, { onConflict: 'slug' });

  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }
  console.log('Article inserted successfully:', data);
}

seed();
