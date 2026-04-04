-- ============================================================
-- KairoLogic Migration v12 - PART 3: Seed Email Templates
-- Matches existing email_templates schema with event_type column
-- ============================================================

-- Template 1: Immediate Summary (after scan completes)
INSERT INTO email_templates (slug, name, subject, html_body, event_type, trigger_event, recipient_type, variables, is_active)
VALUES (
  'immediate-summary',
  'Immediate Risk Summary',
  'ALERT: Sovereignty Risk Summary for {{practice_name}}',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:Inter,-apple-system,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;"><tr><td style="background:#00234E;padding:30px 40px;text-align:center;border-bottom:4px solid #FF6600;"><div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:2px;">KAIRO<span style="color:#FF6600;">LOGIC</span></div><div style="font-size:10px;color:#8899aa;letter-spacing:3px;margin-top:4px;">SOVEREIGNTY AUDIT &amp; COMPLIANCE</div></td></tr><tr><td style="background:#fff;padding:40px;"><p style="color:#333;font-size:15px;line-height:1.6;">Dear {{practice_manager_name}},</p><p style="color:#333;font-size:15px;line-height:1.6;">The KairoLogic Sentry Engine has completed its forensic audit of <strong>{{practice_name}}</strong>. A preliminary assessment of your digital border and statutory alignment has been logged.</p><div style="background:#f8f9fa;border:2px solid #e5e7eb;border-radius:12px;padding:24px;margin:24px 0;"><div style="font-size:10px;font-weight:900;color:#9ca3af;letter-spacing:2px;margin-bottom:12px;">CURRENT STANDING</div><table width="100%"><tr><td style="color:#666;font-size:13px;padding:4px 0;">Status:</td><td style="color:#00234E;font-weight:700;font-size:13px;">{{status_label}}</td></tr><tr><td style="color:#666;font-size:13px;padding:4px 0;">Audit ID:</td><td style="color:#C5A059;font-weight:700;font-size:13px;font-family:monospace;">{{report_id}}</td></tr><tr><td style="color:#666;font-size:13px;padding:4px 0;">Key Finding:</td><td style="color:#333;font-size:13px;">{{top_violation_summary}}</td></tr></table></div><p style="color:#333;font-size:15px;line-height:1.6;">Your full Sovereignty Audit &amp; Forensic Report is now available. This document contains the technical evidence and the prioritized Remedial Engineering Roadmap required to establish Safe Harbor protection under Texas SB 1188 and HB 149.</p><div style="text-align:center;margin:32px 0;"><a href="https://kairologic.net/scan/results?npi={{npi}}&mode=verified" style="background:#00234E;color:#fff;font-weight:900;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:16px 40px;border-radius:8px;text-decoration:none;display:inline-block;">ACCESS FORENSIC REPORT</a></div><p style="color:#dc2626;font-size:13px;line-height:1.6;background:#fef2f2;padding:12px 16px;border-radius:8px;border-left:4px solid #dc2626;"><strong>Please note:</strong> Statutory penalties for knowing violations can reach $250,000. We recommend immediate review of the remediation steps.</p><p style="color:#333;font-size:15px;line-height:1.6;margin-top:24px;">Regards,</p><p style="color:#00234E;font-weight:700;font-size:14px;">KairoLogic Compliance Desk<br><span style="color:#888;font-weight:400;font-size:12px;">Austin, TX | (512) 402-2237</span></p></td></tr><tr><td style="background:#f1f5f9;padding:20px 40px;text-align:center;"><div style="font-size:10px;color:#9ca3af;line-height:1.5;">KairoLogic (a Methuselah LLC company) | Leander, TX<br>compliance@kairologic.net | (512) 402-2237</div></td></tr></table></body></html>',
  'scan_complete',
  'scan_complete',
  'provider',
  '["practice_name","practice_manager_name","status_label","report_id","top_violation_summary","npi","year"]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, html_body = EXCLUDED.html_body,
  event_type = EXCLUDED.event_type, trigger_event = EXCLUDED.trigger_event,
  recipient_type = EXCLUDED.recipient_type, variables = EXCLUDED.variables, updated_at = now();


-- Template 2: Technical Consultation (Request Briefing)
INSERT INTO email_templates (slug, name, subject, html_body, event_type, trigger_event, recipient_type, variables, is_active)
VALUES (
  'technical-consultation',
  'Technical Consultation Confirmed',
  'CONFIRMED: KairoShield Sovereignty Briefing',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:Inter,-apple-system,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;"><tr><td style="background:#00234E;padding:30px 40px;text-align:center;border-bottom:4px solid #FF6600;"><div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:2px;">KAIRO<span style="color:#FF6600;">LOGIC</span></div><div style="font-size:10px;color:#8899aa;letter-spacing:3px;margin-top:4px;">SOVEREIGNTY AUDIT &amp; COMPLIANCE</div></td></tr><tr><td style="background:#fff;padding:40px;"><p style="color:#333;font-size:15px;line-height:1.6;">Your request for a technical briefing has been received. Due to the Critical Drift identified during the forensic scan, this session has been prioritized.</p><div style="background:#f8f9fa;border:2px solid #e5e7eb;border-radius:12px;padding:24px;margin:24px 0;"><div style="font-size:10px;font-weight:900;color:#9ca3af;letter-spacing:2px;margin-bottom:12px;">MEETING DETAILS</div><table width="100%"><tr><td style="color:#666;font-size:13px;padding:4px 0;">Topic:</td><td style="color:#00234E;font-weight:700;font-size:13px;">Statutory Risk Assessment &amp; Migration Requirements</td></tr><tr><td style="color:#666;font-size:13px;padding:4px 0;">Organizer:</td><td style="color:#333;font-size:13px;">KairoLogic Compliance</td></tr><tr><td style="color:#666;font-size:13px;padding:4px 0;">Reference:</td><td style="color:#C5A059;font-weight:700;font-size:13px;font-family:monospace;">Audit ID {{report_id}}</td></tr></table></div><div style="text-align:center;margin:32px 0;"><a href="https://schedule.fillout.com/t/927Gv1zpdpus" style="background:#00234E;color:#fff;font-weight:900;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:16px 40px;border-radius:8px;text-decoration:none;display:inline-block;">CONFIRM BRIEFING TIME</a></div><p style="color:#333;font-size:15px;line-height:1.6;">During this 15-minute session, our engineering desk will walk through the OCONUS data drift points and the specific architecture required for your Sovereign Blueprint.</p><p style="color:#333;font-size:15px;line-height:1.6;margin-top:16px;">For immediate assistance, contact the desk at <strong>(512) 402-2237</strong>.</p></td></tr><tr><td style="background:#f1f5f9;padding:20px 40px;text-align:center;"><div style="font-size:10px;color:#9ca3af;line-height:1.5;">KairoLogic (a Methuselah LLC company) | Leander, TX<br>compliance@kairologic.net | (512) 402-2237</div></td></tr></table></body></html>',
  'consultation_booked',
  'consultation_booked',
  'provider',
  '["practice_name","practice_manager_name","report_id","year"]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, html_body = EXCLUDED.html_body,
  event_type = EXCLUDED.event_type, trigger_event = EXCLUDED.trigger_event,
  recipient_type = EXCLUDED.recipient_type, variables = EXCLUDED.variables, updated_at = now();


-- Template 3: SentryShield Activation (Post-Stripe payment)
INSERT INTO email_templates (slug, name, subject, html_body, event_type, trigger_event, recipient_type, variables, is_active)
VALUES (
  'sentryshield-activation',
  'SentryShield Activation Receipt',
  'RECEIPT: SentryShield Protection Activated',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f8f9fa;font-family:Inter,-apple-system,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;"><tr><td style="background:#00234E;padding:30px 40px;text-align:center;border-bottom:4px solid #FF6600;"><div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:2px;">KAIRO<span style="color:#FF6600;">LOGIC</span></div><div style="font-size:10px;color:#8899aa;letter-spacing:3px;margin-top:4px;">SOVEREIGNTY AUDIT &amp; COMPLIANCE</div></td></tr><tr><td style="background:#fff;padding:40px;"><div style="text-align:center;margin-bottom:24px;"><div style="display:inline-block;background:#ecfdf5;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">&#x2705;</div></div><h2 style="color:#00234E;font-size:22px;text-align:center;margin-bottom:8px;">Payment Verified. Your Practice is Now Shielded.</h2><p style="color:#333;font-size:15px;line-height:1.6;">Thank you for activating SentryShield Continuous Protection for <strong>{{practice_name}}</strong>. Your forensic record of compliance is now being maintained in our secure Austin registry.</p><div style="background:#f8f9fa;border:2px solid #e5e7eb;border-radius:12px;padding:24px;margin:24px 0;"><div style="font-size:10px;font-weight:900;color:#9ca3af;letter-spacing:2px;margin-bottom:12px;">WHAT THIS INCLUDES</div><table width="100%"><tr><td style="color:#10b981;font-size:16px;padding:6px 8px 6px 0;vertical-align:top;">&#x2713;</td><td style="color:#333;font-size:13px;padding:6px 0;"><strong>Continuous Monitoring:</strong> Monthly forensic scans to detect Compliance Drift.</td></tr><tr><td style="color:#10b981;font-size:16px;padding:6px 8px 6px 0;vertical-align:top;">&#x2713;</td><td style="color:#333;font-size:13px;padding:6px 0;"><strong>Trust Seal:</strong> You are now authorized to display the KairoLogic Trust Seal.</td></tr><tr><td style="color:#10b981;font-size:16px;padding:6px 8px 6px 0;vertical-align:top;">&#x2713;</td><td style="color:#333;font-size:13px;padding:6px 0;"><strong>Priority Access:</strong> Direct line to our compliance engineering desk.</td></tr></table></div><div style="text-align:center;margin:32px 0;"><a href="https://kairologic.net/payment/success" style="background:#00234E;color:#fff;font-weight:900;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:16px 40px;border-radius:8px;text-decoration:none;display:inline-block;">DOWNLOAD TRUST SEAL &amp; ASSETS</a></div><p style="color:#333;font-size:15px;line-height:1.6;">Your subscription receipt is attached. Welcome to the Safe Harbor Zone.</p><p style="color:#00234E;font-weight:700;font-size:14px;margin-top:24px;">KairoLogic Compliance<br><span style="color:#888;font-weight:400;font-size:12px;">(512) 402-2237</span></p></td></tr><tr><td style="background:#f1f5f9;padding:20px 40px;text-align:center;"><div style="font-size:10px;color:#9ca3af;line-height:1.5;">KairoLogic (a Methuselah LLC company) | Leander, TX<br>compliance@kairologic.net | (512) 402-2237</div></td></tr></table></body></html>',
  'purchase_success',
  'purchase_success',
  'provider',
  '["practice_name","practice_manager_name","year"]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, html_body = EXCLUDED.html_body,
  event_type = EXCLUDED.event_type, trigger_event = EXCLUDED.trigger_event,
  recipient_type = EXCLUDED.recipient_type, variables = EXCLUDED.variables, updated_at = now();


-- Verify
SELECT slug, name, event_type, trigger_event, recipient_type, is_active FROM email_templates ORDER BY slug;

