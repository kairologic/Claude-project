import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getOverviewStats, getDataFindings } from '@/lib/content-studio/pipeline-queries';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category')?.trim();
    const mode = request.nextUrl.searchParams.get('mode') || 'general'; // 'general' or 'data_driven'

    // Always fetch overview stats
    const stats = await getOverviewStats();

    // For data-driven mode, also fetch rich findings from the provider DB
    let findingsContext = '';
    if (mode === 'data_driven') {
      const findings = await getDataFindings();

      const parts: string[] = [];

      // Mismatch rate
      const mr = findings.mismatch_rate as Record<string, unknown>;
      if (mr && mr.total_practices) {
        parts.push(`MISMATCH OVERVIEW: ${mr.mismatch_pct}% of ${mr.total_practices} practices have data mismatches (${mr.total_mismatches} total mismatches). Worst single practice has ${mr.worst_mismatch_count} mismatches.`);
      }

      // State breakdown
      const states = findings.state_breakdown as Record<string, unknown>[];
      if (states?.length) {
        const stateLines = states.slice(0, 5).map((s) =>
          `${s.state}: ${s.practices} practices, ${s.total_mismatches} mismatches (avg ${s.avg_mismatches_per_practice}/practice, ${s.providers_affected} providers)`
        ).join('; ');
        parts.push(`TOP STATES BY MISMATCHES: ${stateLines}`);
      }

      // Scan health
      const scans = findings.scan_health as Record<string, unknown>[];
      if (scans?.length) {
        const scanLines = scans.map((s) => `${s.scan_status}: ${s.count} (${s.pct}%)`).join(', ');
        parts.push(`SCAN HEALTH: ${scanLines}`);
      }

      // Payer directory mismatches
      const payer = findings.payer_mismatches as Record<string, unknown>[];
      if (payer?.length) {
        const payerLines = payer.map((p) => `${p.field_name} (${p.mismatch_type}): ${p.count} cases, priority ${p.priority}`).join('; ');
        parts.push(`PAYER DIRECTORY ISSUES: ${payerLines}`);
      }

      // Specialties with issues
      const specs = findings.top_specialties_with_issues as Record<string, unknown>[];
      if (specs?.length) {
        const specLines = specs.slice(0, 7).map((s) => `${s.specialty}: ${s.count}`).join(', ');
        parts.push(`SPECIALTIES MOST AFFECTED: ${specLines}`);
      }

      findingsContext = parts.length > 0
        ? `\n\nDETAILED DATA FINDINGS FROM KAIROLOGIC'S PROVIDER INTELLIGENCE DATABASE:\n${parts.join('\n')}`
        : '';
    }

    const categoryInstruction = category
      ? `Focus all suggestions specifically on the category/area: "${category}". Every topic must relate directly to this category within the healthcare credentialing and practice management space.`
      : 'Cover a variety of relevant topics across credentialing, compliance, and practice management.';

    const modeInstruction = mode === 'data_driven'
      ? `IMPORTANT: Generate topics that are directly grounded in the specific data findings below. Each topic should reference real numbers, percentages, state-level trends, or specific mismatch types from the data. Make topics feel like they come from someone who has analyzed 200K+ providers and found surprising patterns. Use specific data points as hooks (e.g., "We analyzed 57K practices and found X% have Y problem" or "In [State], the average practice has N data mismatches").`
      : 'Topics should be specific, data-backed where possible, and timely.';

    const prompt = `Based on KairoLogic's provider intelligence data, suggest 5 compelling content topics for LinkedIn thought leadership posts targeting healthcare practice managers and credentialing professionals.

${categoryInstruction}

${modeInstruction}

Pipeline Overview:
- Total providers monitored: ${stats.total_providers || 'N/A'}
- Total practices: ${stats.total_practices || 'N/A'}
- Practices with data mismatches: ${stats.practices_with_mismatches || 'N/A'}
- NPPES delta events this week: ${stats.recent_delta_events || 'N/A'}${findingsContext}

Return a JSON array of objects with "topic" and "angle" fields. No markdown fences.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 768,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const suggestions = JSON.parse(cleaned);

    return NextResponse.json({ suggestions, stats, mode });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
