-- KairoLogic Round 2 Campaign: 0 providers, score < 60
-- Generated 2026-03-06 17:44

INSERT INTO campaign_outreach (npi, report_code, email_sent_to, practice_name, url, campaign_name) VALUES

ON CONFLICT DO NOTHING;

-- Verify
SELECT npi, practice_name, email_sent_to, url FROM campaign_outreach WHERE campaign_name = 'sb1188-round2' ORDER BY created_at;
