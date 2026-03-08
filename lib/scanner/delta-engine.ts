// ═══════════════════════════════════════════════════════════════════
// INTEGRATION PATCH FOR: lib/scanner/delta-engine.ts
// Feature: Validation Gate Decoupling
// ═══════════════════════════════════════════════════════════════════
//
// Your delta-engine.ts has NO gate check blocking writes (confirmed).
// The integration is a simple addition: stamp each delta event with
// a verification_status before writing to the DB.
//
// TWO CHANGES NEEDED:
//
// ── CHANGE 1: Add import at the top of delta-engine.ts ──────────
//
// Add this after the existing type imports:

import { stampDeltaEventVerification } from './validation-gate-status';

// ── CHANGE 2: Stamp verification_status in the DB write ─────────
//
// In the runDeltaDetection() function, find this block (around line 230):
//
//   const rows = batch.map(d => ({
//     npi: d.npi,
//     practice_website_id: d.practice_website_id,
//     field_name: d.field_name,
//     old_value: d.old_value,
//     new_value: d.new_value,
//     detection_source: d.detection_source,
//     confidence: d.confidence,
//     confidence_score: d.confidence_score,
//     signal_type: d.signal_type,
//     corroborated_by: d.corroborated_by,
//     corroboration_count: d.corroboration_count,
//     detected_at: new Date().toISOString(),
//   }));
//
// REPLACE WITH:

      const rows = await Promise.all(batch.map(async (d) => {
        // Stamp verification status based on detection source and gate status
        const verification = await stampDeltaEventVerification(
          '', // ID not yet assigned (DB will generate)
          d.detection_source,  // 'web_scan' | 'state_board' | 'tmb_orssp' | 'ca_mb_bulk'
          d.confidence_score,
        );

        return {
          npi: d.npi,
          practice_website_id: d.practice_website_id,
          field_name: d.field_name,
          old_value: d.old_value,
          new_value: d.new_value,
          detection_source: d.detection_source,
          confidence: d.confidence,
          confidence_score: d.confidence_score,
          signal_type: d.signal_type,
          corroborated_by: d.corroborated_by,
          corroboration_count: d.corroboration_count,
          detected_at: new Date().toISOString(),
          // NEW: verification gate fields
          verification_status: verification.verification_status,
          gate_status_at_creation: verification.gate_status_at_creation,
        };
      }));

// ═══════════════════════════════════════════════════════════════════
// THAT'S IT. Two changes total.
//
// What this does:
//   - Web scan detections (address, phone found on website vs NPPES):
//     → Always stamped as 'verified' (no NPI resolution involved)
//
//   - State board detections (license status from TMB/CA MB):
//     → Stamped as 'verified' if the validation gate passes
//     → Stamped as 'pending_verification' if the gate fails
//     → High-confidence PECOS matches (>= 0.95) always 'verified'
//
//   - The gate status is cached for 5 minutes, so the batch of
//     100+ delta events doesn't query the DB 100 times
//
// What this does NOT do:
//   - It does NOT block any writes (every event is still written)
//   - It does NOT change the detection logic at all
//   - It does NOT affect the mismatch flag updates on practice_providers
// ═══════════════════════════════════════════════════════════════════
