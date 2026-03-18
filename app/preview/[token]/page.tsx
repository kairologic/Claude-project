/**
 * app/preview/[token]/page.tsx
 *
 * Public preview page — no auth required.
 * Fetches practice data via preview token and shows findings.
 * Practice manager enters email to claim their dashboard.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import PreviewPage from '@/components/dashboard/PreviewPage';

export default async function PreviewServerPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const admin = createAdminSupabaseClient();

  // Validate token
  const { data: tokenData } = await admin
    .from('preview_tokens')
    .select(`
      id, token, practice_website_id, is_claimed, expires_at, view_count,
      first_viewed_at
    `)
    .eq('token', token)
    .single();

  if (!tokenData) {
    return <ExpiredPage message="This preview link is invalid." />;
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return <ExpiredPage message="This preview link has expired." />;
  }

  if (tokenData.is_claimed) {
    return <ExpiredPage message="This practice has already been claimed. Please log in to access your dashboard." showLogin />;
  }

  const practiceId = tokenData.practice_website_id;

  // Update view tracking
  await admin
    .from('preview_tokens')
    .update({
      view_count: (tokenData.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
      first_viewed_at: tokenData.first_viewed_at || new Date().toISOString(),
    })
    .eq('id', tokenData.id);

  // Fetch practice info
  const { data: practice } = await admin
    .from('practice_websites')
    .select('id, name, city, state, provider_count, mismatch_count')
    .eq('id', practiceId)
    .single();

  if (!practice) {
    return <ExpiredPage message="Practice not found." />;
  }

  // Fetch providers with issues for this practice
  const { data: providers } = await admin
    .from('practice_providers')
    .select('provider_name, npi, active_mismatch_count, has_address_mismatch, has_phone_mismatch, has_taxonomy_mismatch, has_name_mismatch, has_license_issue')
    .eq('practice_website_id', practiceId)
    .gt('active_mismatch_count', 0)
    .order('active_mismatch_count', { ascending: false });

  // Count finding types from delta events
  const { data: deltas } = await admin
    .from('nppes_delta_events')
    .select('signal_type')
    .eq('practice_website_id', practiceId)
    .eq('resolved', false)
    .eq('verification_status', 'verified');

  const signalCounts: Record<string, number> = {};
  (deltas || []).forEach(d => {
    signalCounts[d.signal_type] = (signalCounts[d.signal_type] || 0) + 1;
  });

  // Count license issues
  const licenseCount = (providers || []).filter(p => p.has_license_issue).length;

  const findings = {
    address_mismatches: signalCounts['address_change'] || 0,
    phone_mismatches: signalCounts['phone_change'] || 0,
    name_mismatches: (signalCounts['name_change'] || 0) + (signalCounts['provider_moved'] || 0),
    taxonomy_mismatches: signalCounts['specialty_change'] || 0,
    license_issues: licenseCount,
    total: (deltas || []).length + licenseCount,
  };

  const providerPreviews = (providers || []).map(p => {
    const issues: string[] = [];
    if (p.has_address_mismatch) issues.push('Address');
    if (p.has_phone_mismatch) issues.push('Phone');
    if (p.has_taxonomy_mismatch) issues.push('Specialty');
    if (p.has_name_mismatch) issues.push('Name');
    if (p.has_license_issue) issues.push('License');
    return {
      provider_name: p.provider_name || 'Unknown',
      npi: p.npi || '',
      issues,
      issue_count: p.active_mismatch_count || issues.length,
    };
  });

  const totalWithIssues = providerPreviews.length;

  return (
    <PreviewPage
      practice={{
        name: practice.name || 'Practice',
        city: practice.city || '',
        state: practice.state || '',
        provider_count: practice.provider_count || 0,
        mismatch_count: practice.mismatch_count || 0,
      }}
      findings={findings}
      providers={providerPreviews}
      totalProviders={totalWithIssues}
      token={token}
    />
  );
}

function ExpiredPage({ message, showLogin }: { message: string; showLogin?: boolean }) {
  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#FAFAFA', padding: 20,
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{
        background: '#fff', borderRadius: 12, padding: '36px 32px',
        width: '100%', maxWidth: 420, textAlign: 'center',
        border: '1px solid #E8EAED', boxShadow: '0 4px 24px rgba(0,0,0,.06)',
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20 }}>
          <span style={{ color: '#0F1E2E' }}>Kairo</span>
          <span style={{ color: '#D4A017' }}>Logic</span>
        </div>
        <div style={{ fontSize: 14, color: '#5A6472', lineHeight: 1.5, marginBottom: 20 }}>
          {message}
        </div>
        {showLogin && (
          <a href="/login" style={{
            display: 'inline-block', padding: '10px 24px', background: '#0F1E2E',
            color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700,
            textDecoration: 'none',
          }}>Sign in</a>
        )}
      </div>
    </div>
  );
}
