/**
 * KairoLogic Sentry Compliance Widget v3.0
 * =========================================
 * Redesigned trust badge + compliance drift detection engine.
 * 
 * v3.0 Changes:
 *   - Redesigned badge: "Verified Sovereign" (Watch) / "Sentry Shield™" (Shield)
 *   - Patient-friendly trust pane: US-Sovereign Data, AI Transparent, Access Controlled
 *   - Drift count nudge: shows event count + severity in widget
 *   - Watch: upgrade CTA to Stripe. Shield: dashboard link.
 *   - Close button on expanded pane
 *   - DM Sans typography
 * 
 * Usage:
 * <script src="https://kairologic.net/sentry.js" data-npi="1234567890" data-mode="shield"></script>
 * 
 * Attributes:
 *   data-npi       Required. 10-digit NPI.
 *   data-mode      "watch" (default) or "shield"
 *   data-position  "bottom-right" (default), "bottom-left", "inline"
 *   data-theme     "auto" (default), "light", "dark"
 * 
 * What it does:
 *   1. Renders glassmorphism trust badge (existing v1 UI)
 *   2. Extracts compliance-relevant content from the DOM
 *   3. Generates SHA-256 hashes per compliance category
 *   4. Compares against known baseline from last scan
 *   5. Reports drift events to KairoLogic API
 *   6. Sends periodic heartbeats (1x per hour max)
 * 
 * Deploy to: public/sentry.js (replaces existing)
 */
(function() {
  'use strict';

  var VERSION = '3.0.0';
  var API_BASE = window.KAIROLOGIC_API_URL || 'https://kairologic.net';
  var DRIFT_API = API_BASE + '/api/widget';
  var HEARTBEAT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  // ── Find script tag ──
  var scriptTag = document.currentScript || (function() {
    var s = document.getElementsByTagName('script');
    for (var i = s.length - 1; i >= 0; i--) {
      if (s[i].src && s[i].src.indexOf('sentry') !== -1) return s[i];
    }
    return null;
  })();

  if (!scriptTag) { console.error('[KairoLogic] Script tag not found'); return; }

  var cfg = {
    npi:      scriptTag.getAttribute('data-npi') || '',
    mode:     scriptTag.getAttribute('data-mode') || 'watch',
    position: scriptTag.getAttribute('data-position') || 'bottom-right',
    theme:    scriptTag.getAttribute('data-theme') || 'auto'
  };

  if (!cfg.npi || cfg.npi.length !== 10) {
    console.error('[KairoLogic] Invalid NPI:', cfg.npi);
    return;
  }

  var isShield = cfg.mode === 'shield';

  // ══════════════════════════════════════════════════════════
  // PART 1: BADGE UI — v3 Redesign
  // ══════════════════════════════════════════════════════════

  // ── Detect dark background (for auto theme) ──
  function detectTheme() {
    if (cfg.theme !== 'auto') return cfg.theme;
    try {
      var bg = window.getComputedStyle(document.body).backgroundColor;
      var m = bg.match(/\d+/g);
      if (m) {
        var lum = (parseInt(m[0]) * 299 + parseInt(m[1]) * 587 + parseInt(m[2]) * 114) / 1000;
        return lum < 128 ? 'dark' : 'light';
      }
    } catch(e) {}
    return 'light';
  }

  // ── Styles ──
  var css = ''
    + '@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap");'

    // Root container
    + '#kl-sentry { font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.4; box-sizing: border-box; z-index: 99999; }'
    + '#kl-sentry * { box-sizing: border-box; }'
    + '#kl-sentry.kl-hidden { display: none !important; }'
    + '.kl-pos-bottom-right { position: fixed; bottom: 20px; right: 20px; }'
    + '.kl-pos-bottom-left { position: fixed; bottom: 20px; left: 20px; }'
    + '.kl-pos-inline { position: relative; display: inline-block; }'

    // Badge (collapsed)
    + '.kl-badge-v3 {'
    +   'display:flex;align-items:center;gap:10px;'
    +   'padding:10px 16px 10px 12px;border-radius:14px;cursor:pointer;'
    +   'transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);'
    +   'box-shadow:0 4px 20px rgba(0,0,0,0.12),0 0 0 1px rgba(255,255,255,0.1) inset;'
    +   'user-select:none;position:relative;overflow:hidden;'
    + '}'
    + '.kl-badge-v3:hover { transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,0.16),0 0 0 1px rgba(255,255,255,0.1) inset; }'
    + '.kl-badge-v3:active { transform:translateY(0); }'
    + '.kl-badge-v3.kl-verified { background:linear-gradient(135deg,#0A192F 0%,#132d54 100%);color:white; }'
    + '.kl-badge-v3.kl-unknown { background:linear-gradient(135deg,#475569 0%,#64748b 100%);color:white; }'

    // Badge icon
    + '.kl-badge-icon { width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(255,255,255,0.1);position:relative; }'
    + '.kl-badge-icon svg { width:18px;height:18px;stroke:white;fill:none; }'
    + '.kl-badge-check { position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #0A192F; }'
    + '.kl-badge-check svg { width:7px;height:7px;stroke:white;stroke-width:3;fill:none; }'

    // Badge text
    + '.kl-badge-text { flex:1;min-width:0; }'
    + '.kl-badge-title { font-size:11px;font-weight:800;letter-spacing:0.2px;line-height:1.2; }'
    + '.kl-badge-sub { font-size:8px;font-weight:600;opacity:0.6;text-transform:uppercase;letter-spacing:0.8px;margin-top:1px; }'

    // Badge chevron
    + '.kl-badge-chevron { width:16px;height:16px;opacity:0.5;transition:transform 0.3s;flex-shrink:0; }'
    + '.kl-badge-chevron svg { width:16px;height:16px;stroke:white;fill:none; }'
    + '.kl-badge-v3.kl-expanded .kl-badge-chevron { transform:rotate(180deg); }'

    // Shield pulse dot
    + '.kl-shield-pulse { position:absolute;top:6px;right:6px;width:8px;height:8px; }'
    + '.kl-shield-pulse::before { content:"";position:absolute;inset:0;border-radius:50%;background:#22c55e;animation:kl-pulse 2s ease-in-out infinite; }'
    + '.kl-shield-pulse::after { content:"";position:absolute;inset:2px;border-radius:50%;background:#22c55e; }'
    + '@keyframes kl-pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(1.8);} }'

    // ── Expanded Pane ──
    + '.kl-pane-v3 {'
    +   'position:absolute;bottom:calc(100% + 8px);width:320px;border-radius:16px;overflow:hidden;'
    +   'opacity:0;transform:translateY(8px) scale(0.96);pointer-events:none;'
    +   'transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);'
    +   'box-shadow:0 20px 60px rgba(0,0,0,0.15),0 0 0 1px rgba(0,0,0,0.04);'
    + '}'
    + '.kl-pos-bottom-right .kl-pane-v3 { right:0; }'
    + '.kl-pos-bottom-left .kl-pane-v3 { left:0; }'
    + '.kl-pane-v3.kl-open { opacity:1;transform:translateY(0) scale(1);pointer-events:auto; }'
    + '.kl-pane-v3-inner { background:white; }'

    // Pane header
    + '.kl-pane-header { background:linear-gradient(135deg,#0A192F 0%,#1a365d 100%);padding:16px 18px;display:flex;align-items:center;gap:10px; }'
    + '.kl-pane-header-icon { width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0; }'
    + '.kl-pane-header-icon svg { width:20px;height:20px;stroke:#C5A059;fill:none; }'
    + '.kl-pane-header-text { flex:1; }'
    + '.kl-pane-header-title { color:white;font-size:13px;font-weight:800;letter-spacing:-0.2px; }'
    + '.kl-pane-header-sub { color:rgba(255,255,255,0.5);font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-top:2px; }'
    + '.kl-pane-close { width:24px;height:24px;border-radius:6px;border:none;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s; }'
    + '.kl-pane-close:hover { background:rgba(255,255,255,0.2);color:white; }'
    + '.kl-pane-close svg { width:12px;height:12px;stroke:currentColor;fill:none; }'

    // Status banner
    + '.kl-status-banner { display:flex;align-items:center;gap:8px;padding:10px 18px;font-size:10px;font-weight:700; }'
    + '.kl-status-pass { background:#f0fdf4;color:#166534;border-bottom:1px solid #dcfce7; }'
    + '.kl-status-warn { background:#fffbeb;color:#92400e;border-bottom:1px solid #fef3c7; }'
    + '.kl-status-unknown { background:#f8fafc;color:#64748b;border-bottom:1px solid #f1f5f9; }'
    + '.kl-status-dot { width:6px;height:6px;border-radius:50%; }'
    + '.kl-status-pass .kl-status-dot { background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.4); }'
    + '.kl-status-warn .kl-status-dot { background:#f59e0b; }'
    + '.kl-status-unknown .kl-status-dot { background:#94a3b8; }'

    // Trust rows
    + '.kl-trust-section { padding:14px 18px; }'
    + '.kl-trust-row { display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9; }'
    + '.kl-trust-row:last-child { border-bottom:none; }'
    + '.kl-trust-row-icon { width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px; }'
    + '.kl-trust-row-content { flex:1; }'
    + '.kl-trust-row-label { font-size:10px;font-weight:700;color:#1e293b; }'
    + '.kl-trust-row-value { font-size:10px;font-weight:500;color:#64748b;margin-top:2px;line-height:1.4; }'
    + '.kl-trust-row-ref { font-size:8px;font-weight:600;color:#94a3b8;margin-top:3px;font-family:"JetBrains Mono",monospace; }'

    // Score bars
    + '.kl-score-bar { display:flex;align-items:center;gap:6px;margin-top:6px; }'
    + '.kl-score-track { flex:1;height:3px;background:#f1f5f9;border-radius:2px;overflow:hidden; }'
    + '.kl-score-fill { height:100%;border-radius:2px;transition:width 0.8s ease; }'
    + '.kl-score-pct { font-size:9px;font-weight:700;font-family:"JetBrains Mono",monospace;min-width:28px;text-align:right; }'

    // Scan date row
    + '.kl-scan-date { display:flex;align-items:center;justify-content:space-between;padding:8px 18px;background:#f8fafc;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9; }'
    + '.kl-scan-date-label { font-size:8px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px; }'
    + '.kl-scan-date-value { font-size:9px;font-weight:700;color:#475569;font-family:"JetBrains Mono",monospace; }'

    // Drift nudge
    + '.kl-drift-alert { margin:0 18px 14px;padding:10px 12px;border-radius:10px;display:none; }'
    + '.kl-drift-alert.kl-visible { display:block; }'
    + '.kl-drift-alert-default { background:#fffbeb;border:1px solid #fde68a; }'
    + '.kl-drift-alert-critical { background:#fef2f2;border:1px solid #fecaca; }'
    + '.kl-drift-alert-header { display:flex;align-items:center;gap:6px; }'
    + '.kl-drift-alert-icon { font-size:12px; }'
    + '.kl-drift-alert-count { font-size:10px;font-weight:700; }'
    + '.kl-drift-alert-default .kl-drift-alert-count { color:#92400e; }'
    + '.kl-drift-alert-critical .kl-drift-alert-count { color:#991b1b; }'
    + '.kl-drift-alert-detail { font-size:9px;margin-top:3px;line-height:1.4; }'
    + '.kl-drift-alert-default .kl-drift-alert-detail { color:#a16207; }'
    + '.kl-drift-alert-critical .kl-drift-alert-detail { color:#b91c1c; }'
    + '.kl-drift-alert-cta { display:block;text-align:center;margin-top:8px;padding:6px;border-radius:6px;font-size:9px;font-weight:700;text-decoration:none;transition:all 0.2s;color:white; }'
    + '.kl-drift-alert-cta:hover { opacity:0.9;transform:translateY(-1px); }'

    // Action buttons
    + '.kl-pane-actions { padding:0 18px 14px; }'
    + '.kl-pane-btn { display:block;width:100%;text-align:center;padding:10px;border-radius:10px;font-size:11px;font-weight:700;text-decoration:none;transition:all 0.2s;border:none;cursor:pointer;margin-bottom:6px;font-family:"DM Sans",sans-serif; }'
    + '.kl-pane-btn-primary { background:#FF6700;color:white; }'
    + '.kl-pane-btn-primary:hover { background:#e55b00;transform:translateY(-1px); }'
    + '.kl-pane-btn-secondary { background:rgba(10,25,47,0.04);color:#0A192F;border:1px solid rgba(10,25,47,0.08); }'
    + '.kl-pane-btn-secondary:hover { background:rgba(10,25,47,0.08); }'

    // Footer
    + '.kl-pane-footer-v3 { padding:10px 18px;text-align:center;border-top:1px solid #f1f5f9; }'
    + '.kl-pane-footer-v3 a { font-size:8px;color:#94a3b8;text-decoration:none;font-weight:600;letter-spacing:0.3px; }'
    + '.kl-pane-footer-v3 a:hover { color:#64748b; }';

  // ── SVG Icons ──
  var ico = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
  };

  // ── Init UI ──
  function init() {
    fetchWidgetData(cfg.npi, function(data) {
      var theme = detectTheme();
      var status = data ? data.status : 'unregistered';
      var lastScan = data && data.last_scan ? new Date(data.last_scan).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not yet scanned';

      var html = buildBadge(status);
      if (status === 'verified') {
        html += buildTrustPane(data, lastScan);
      } else {
        html += buildUnregisteredPane();
      }

      var root = document.createElement('div');
      root.id = 'kl-sentry';
      root.className = 'kl-pos-' + cfg.position;

      var style = document.createElement('style');
      style.textContent = css;
      root.appendChild(style);

      var content = document.createElement('div');
      content.innerHTML = html;
      root.appendChild(content);

      document.body.appendChild(root);
      wireToggle(root);
    });
  }

  function buildBadge(status) {
    var verified = status === 'verified';
    var badgeClass = verified ? 'kl-verified' : 'kl-unknown';

    return ''
      + '<div class="kl-badge-v3 ' + badgeClass + '" id="kl-badge" role="button" tabindex="0" aria-expanded="false">'
      +   '<div class="kl-badge-icon">'
      +     ico.shield
      +     (verified ? '<div class="kl-badge-check">' + ico.check + '</div>' : '')
      +   '</div>'
      +   '<div class="kl-badge-text">'
      +     '<div class="kl-badge-title">' + (verified ? (isShield ? 'Data & AI Trust' : 'Data & AI Trust') : 'Compliance Unknown') + '</div>'
      +     '<div class="kl-badge-sub">' + (verified ? (isShield ? 'Live Monitoring Active' : 'US Data \u00b7 AI Disclosed') : 'Not yet verified') + '</div>'
      +   '</div>'
      +   (isShield && verified ? '<div class="kl-shield-pulse"></div>' : '')
      +   '<div class="kl-badge-chevron">' + ico.chevron + '</div>'
      + '</div>';
  }

  function buildTrustPane(data, lastScan) {
    var score = data.compliance_score || 0;

    return ''
      + '<div class="kl-pane-v3" id="kl-pane">'
      +   '<div class="kl-pane-v3-inner">'

      // Header
      +     '<div class="kl-pane-header">'
      +       '<div class="kl-pane-header-icon">' + ico.shield + '</div>'
      +       '<div class="kl-pane-header-text">'
      +         '<div class="kl-pane-header-title">KairoLogic\u2122 Sentry</div>'
      +         '<div class="kl-pane-header-sub">' + (isShield ? 'Shield \u00b7 Live Monitoring' : 'Watch \u00b7 Compliance Verified') + '</div>'
      +       '</div>'
      +       '<button class="kl-pane-close" id="kl-pane-close">' + ico.close + '</button>'
      +     '</div>'

      // Status banner
      +     '<div class="kl-status-banner kl-status-pass">'
      +       '<div class="kl-status-dot"></div>'
      +       '<span>Verified Compliant \u2014 TX SB 1188 & HB 149</span>'
      +     '</div>'

      // Trust rows
      +     '<div class="kl-trust-section">'

      // Data Residency
      +       '<div class="kl-trust-row">'
      +         '<div class="kl-trust-row-icon" style="background:rgba(37,99,235,0.08);">\ud83c\uddfa\ud83c\uddf8</div>'
      +         '<div class="kl-trust-row-content">'
      +           '<div class="kl-trust-row-label">US-Sovereign Data</div>'
      +           '<div class="kl-trust-row-value">Your data is stored physically within the United States on certified infrastructure.</div>'
      +           '<div class="kl-score-bar">'
      +             '<div class="kl-score-track"><div class="kl-score-fill" id="kl-bar-dr" style="width:0%;background:#2563eb;"></div></div>'
      +             '<span class="kl-score-pct" id="kl-val-dr" style="color:#2563eb;">\u2014</span>'
      +           '</div>'
      +           '<div class="kl-trust-row-ref">SB 1188 Sec. 602.054</div>'
      +         '</div>'
      +       '</div>'

      // AI Transparency
      +       '<div class="kl-trust-row">'
      +         '<div class="kl-trust-row-icon" style="background:rgba(217,119,6,0.08);">\ud83e\udd16</div>'
      +         '<div class="kl-trust-row-content">'
      +           '<div class="kl-trust-row-label">AI Transparent & Disclosed</div>'
      +           '<div class="kl-trust-row-value">AI-assisted tools are properly disclosed. No automated-only clinical decisions.</div>'
      +           '<div class="kl-score-bar">'
      +             '<div class="kl-score-track"><div class="kl-score-fill" id="kl-bar-ai" style="width:0%;background:#d97706;"></div></div>'
      +             '<span class="kl-score-pct" id="kl-val-ai" style="color:#d97706;">\u2014</span>'
      +           '</div>'
      +           '<div class="kl-trust-row-ref">HB 149 \u00b7 AI Transparency</div>'
      +         '</div>'
      +       '</div>'

      // Access Control
      +       '<div class="kl-trust-row">'
      +         '<div class="kl-trust-row-icon" style="background:rgba(22,163,74,0.08);">\ud83d\udd12</div>'
      +         '<div class="kl-trust-row-content">'
      +           '<div class="kl-trust-row-label">Access Controlled</div>'
      +           '<div class="kl-trust-row-value">Only your authorized care team can access your health records.</div>'
      +         '</div>'
      +       '</div>'

      +     '</div>'

      // Scan date
      +     '<div class="kl-scan-date">'
      +       '<span class="kl-scan-date-label">' + (isShield ? 'Monitoring Since' : 'Last Verified') + '</span>'
      +       '<span class="kl-scan-date-value">' + lastScan + (isShield ? ' \u00b7 Live' : '') + '</span>'
      +     '</div>'

      // Drift nudge placeholder (populated by loadDriftCount)
      +     '<div class="kl-drift-alert kl-drift-alert-default" id="kl-drift-nudge">'
      +       '<div class="kl-drift-alert-header">'
      +         '<span class="kl-drift-alert-icon">\u26a0\ufe0f</span>'
      +         '<span class="kl-drift-alert-count" id="kl-drift-count"></span>'
      +       '</div>'
      +       '<div class="kl-drift-alert-detail" id="kl-drift-detail"></div>'
      +       (isShield
        ?       '<a class="kl-drift-alert-cta" id="kl-drift-dash-link" href="#" style="background:#166534;" target="_blank" rel="noopener">\ud83d\udee1\ufe0f Open Dashboard</a>'
        :       '<a class="kl-drift-alert-cta" href="https://buy.stripe.com/test_5kQfZh1IveW058j7ZO4ko00?client_reference_id=' + cfg.npi + '" style="background:#0A192F;" target="_blank" rel="noopener">Upgrade to Shield for Real-Time Alerts \u2192</a>')
      +     '</div>'

      // Actions
      +     '<div class="kl-pane-actions" style="padding-top:14px;">'
      +       '<a class="kl-pane-btn kl-pane-btn-primary" href="' + API_BASE + '/scan/results?npi=' + cfg.npi + '&mode=verified" target="_blank" rel="noopener">View Full Compliance Report</a>'
      +       (isShield ? '<a class="kl-pane-btn kl-pane-btn-secondary" id="kl-shield-dash-link" href="' + API_BASE + '/dashboard/' + cfg.npi + '" target="_blank" rel="noopener">\ud83d\udee1\ufe0f Open Compliance Dashboard</a>' : '')
      +     '</div>'

      // Footer
      +     '<div class="kl-pane-footer-v3">'
      +       '<a href="' + API_BASE + '" target="_blank" rel="noopener">Powered by KairoLogic Sentry ' + (isShield ? 'Shield\u2122' : 'Watch\u2122') + ' \u00b7 kairologic.net</a>'
      +     '</div>'

      +   '</div>'
      + '</div>';
  }

  function buildUnregisteredPane() {
    return ''
      + '<div class="kl-pane-v3" id="kl-pane">'
      +   '<div class="kl-pane-v3-inner">'
      +     '<div class="kl-pane-header">'
      +       '<div class="kl-pane-header-icon">' + ico.shield + '</div>'
      +       '<div class="kl-pane-header-text">'
      +         '<div class="kl-pane-header-title">KairoLogic\u2122 Sentry</div>'
      +         '<div class="kl-pane-header-sub">Compliance Verification</div>'
      +       '</div>'
      +       '<button class="kl-pane-close" id="kl-pane-close">' + ico.close + '</button>'
      +     '</div>'
      +     '<div class="kl-status-banner kl-status-unknown">'
      +       '<div class="kl-status-dot"></div>'
      +       '<span>This practice has not yet been verified</span>'
      +     '</div>'
      +     '<div style="padding:20px 18px;text-align:center;">'
      +       '<div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:8px;">Verify compliance with TX SB 1188 & HB 149</div>'
      +       '<div style="font-size:10px;color:#94a3b8;margin-bottom:16px;">Run a free compliance scan to verify data sovereignty and AI transparency requirements.</div>'
      +       '<a class="kl-pane-btn kl-pane-btn-primary" href="' + API_BASE + '/scan?npi=' + cfg.npi + '" target="_blank" rel="noopener">Run Free Scan</a>'
      +     '</div>'
      +     '<div class="kl-pane-footer-v3">'
      +       '<a href="' + API_BASE + '" target="_blank" rel="noopener">Powered by KairoLogic \u00b7 kairologic.net</a>'
      +     '</div>'
      +   '</div>'
      + '</div>';
  }

  function wireToggle(root) {
    var badge = root.querySelector('#kl-badge');
    var pane = root.querySelector('#kl-pane');
    var closeBtn = root.querySelector('#kl-pane-close');
    if (!badge || !pane) return;

    var loaded = false;
    function openPane() {
      pane.classList.add('kl-open');
      badge.classList.add('kl-expanded');
      badge.setAttribute('aria-expanded', 'true');
      if (!loaded) {
        loaded = true;
        loadDetails(cfg.npi);
      }
    }
    function closePane() {
      pane.classList.remove('kl-open');
      badge.classList.remove('kl-expanded');
      badge.setAttribute('aria-expanded', 'false');
    }
    function toggle() {
      var isOpen = pane.classList.contains('kl-open');
      if (isOpen) closePane(); else openPane();
    }

    badge.addEventListener('click', toggle);
    badge.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) { e.stopPropagation(); closePane(); });
    }
  }

  function loadDetails(npi) {
    fetch(API_BASE + '/api/report?npi=' + npi, { headers: { 'Accept': 'application/json' } })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(resp) {
        var reports = resp && resp.reports ? resp.reports : (Array.isArray(resp) ? resp : null);
        if (!reports || !reports.length) return;
        var rpt = reports[0];

        if (rpt.category_scores) {
          var cs = rpt.category_scores;
          setBar('kl-bar-dr', 'kl-val-dr', cs.data_sovereignty ? cs.data_sovereignty.percentage : (cs.dataResidency ? cs.dataResidency.percentage : 0));
          setBar('kl-bar-ai', 'kl-val-ai', cs.ai_transparency ? cs.ai_transparency.percentage : (cs.aiTransparency ? cs.aiTransparency.percentage : 0));
        }

        if (rpt.findings && Array.isArray(rpt.findings)) {
          var p = 0, w = 0, f = 0;
          rpt.findings.forEach(function(fi) {
            if (fi.status === 'pass') p++;
            else if (fi.status === 'warn') w++;
            else if (fi.status === 'fail') f++;
          });
          setText('kl-s-pass', p);
          setText('kl-s-warn', w);
          setText('kl-s-fail', f);
        }
      })
      .catch(function() {});

    // Fetch drift event count
    loadDriftCount(npi);

    // For Shield: populate dashboard link
    if (isShield) {
      loadDashboardLink(npi);
    }
  }

  function loadDriftCount(npi) {
    fetch(API_BASE + '/api/widget/drift?npi=' + npi + '&status=new&limit=100', { headers: { 'Accept': 'application/json' } })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data || !data.events || data.events.length === 0) return;

        var events = data.events;
        var total = events.length;
        var critical = 0, high = 0, medium = 0;
        events.forEach(function(e) {
          if (e.severity === 'critical') critical++;
          else if (e.severity === 'high') high++;
          else if (e.severity === 'medium') medium++;
        });

        var countText = total + ' compliance change' + (total !== 1 ? 's' : '') + ' detected';
        var detailParts = [];
        if (critical > 0) detailParts.push(critical + ' critical');
        if (high > 0) detailParts.push(high + ' high severity');
        if (medium > 0) detailParts.push(medium + ' medium');
        var detailText = detailParts.length > 0
          ? detailParts.join(', ') + (isShield ? '' : ' \u2014 upgrade to see details')
          : (isShield ? 'View your dashboard for details' : 'Upgrade to Shield to see details and get alerts');

        var nudge = document.getElementById('kl-drift-nudge');
        var countEl = document.getElementById('kl-drift-count');
        var detailEl = document.getElementById('kl-drift-detail');

        if (nudge && countEl && detailEl) {
          countEl.textContent = countText;
          detailEl.textContent = detailText;
          // Switch to critical styling if critical events exist
          if (critical > 0) {
            nudge.classList.remove('kl-drift-alert-default');
            nudge.classList.add('kl-drift-alert-critical');
          }
          nudge.classList.add('kl-visible');
        }
      })
      .catch(function() {});
  }

  function loadDashboardLink(npi) {
    var dashLink = document.getElementById('kl-shield-dash-link');
    var driftDashLink = document.getElementById('kl-drift-dash-link');
    var url = API_BASE + '/dashboard/' + npi;
    if (dashLink) dashLink.href = url;
    if (driftDashLink) driftDashLink.href = url;
  }

  function setBar(barId, valId, pct) {
    var bar = document.getElementById(barId);
    var val = document.getElementById(valId);
    if (bar) bar.style.width = pct + '%';
    if (val) val.textContent = pct + '%';
  }
  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  function fetchWidgetData(npi, callback) {
    fetch(API_BASE + '/api/widget/' + npi, { headers: { 'Accept': 'application/json' } })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) { callback(data); })
      .catch(function() { callback(null); });
  }
  // PART 2: DRIFT DETECTION ENGINE (new in v2)
  // ══════════════════════════════════════════════════════════

  var lastHeartbeat = 0;

  // ── SHA-256 hash ──
  function sha256(str) {
    if (window.crypto && window.crypto.subtle) {
      var buffer = new TextEncoder().encode(str);
      return window.crypto.subtle.digest('SHA-256', buffer).then(function(hash) {
        return Array.from(new Uint8Array(hash))
          .map(function(b) { return b.toString(16).padStart(2, '0'); })
          .join('');
      });
    }
    return Promise.resolve(simpleHash(str));
  }

  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'sh_' + Math.abs(hash).toString(36);
  }

  // ── Compliance Content Extractors ──
  var driftExtractors = {

    ai_disclosure: function() {
      var signals = [];
      var keywords = ['artificial intelligence', 'ai-powered', 'ai assisted', 'machine learning',
        'automated', 'chatbot', 'virtual assistant', 'ai tool', 'ai system', 'algorithmic',
        'ai disclosure', 'ai notice', 'uses ai', 'powered by ai'];
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      var node;
      while (node = walker.nextNode()) {
        var text = (node.textContent || '').toLowerCase().trim();
        if (text.length < 5) continue;
        for (var i = 0; i < keywords.length; i++) {
          if (text.indexOf(keywords[i]) !== -1) {
            var parent = node.parentElement;
            var tag = parent ? parent.tagName.toLowerCase() : 'unknown';
            if (tag !== 'script' && tag !== 'style' && tag !== 'noscript') {
              signals.push(text.substring(0, 200));
              break;
            }
          }
        }
      }
      var selectors = ['[data-ai-disclosure]', '.ai-disclosure', '#ai-disclosure'];
      for (var s = 0; s < selectors.length; s++) {
        try {
          var els = document.querySelectorAll(selectors[s]);
          for (var e = 0; e < els.length; e++) {
            signals.push((els[e].textContent || '').trim().substring(0, 200));
          }
        } catch(ex) {}
      }
      return signals.sort().join('|');
    },

    privacy_policy: function() {
      var links = document.querySelectorAll('a');
      var found = [];
      for (var i = 0; i < links.length; i++) {
        var href = (links[i].href || '').toLowerCase();
        var text = (links[i].textContent || '').toLowerCase();
        if (href.indexOf('privacy') !== -1 || text.indexOf('privacy policy') !== -1 || text.indexOf('privacy notice') !== -1) {
          found.push(href + '::' + text.trim().substring(0, 50));
        }
      }
      return found.sort().join('|');
    },

    third_party_scripts: function() {
      var scripts = document.querySelectorAll('script[src]');
      var currentHost = window.location.hostname;
      var unique = [];
      for (var i = 0; i < scripts.length; i++) {
        try {
          var url = new URL(scripts[i].src);
          if (url.hostname !== currentHost && url.hostname !== 'kairologic.net') {
            if (unique.indexOf(url.hostname) === -1) unique.push(url.hostname);
          }
        } catch(e) {}
      }
      return unique.sort().join('|');
    },

    data_collection_forms: function() {
      var forms = document.querySelectorAll('form');
      var signals = [];
      for (var i = 0; i < forms.length; i++) {
        var action = forms[i].action || 'none';
        var inputs = forms[i].querySelectorAll('input, select, textarea');
        var fields = [];
        for (var j = 0; j < inputs.length; j++) {
          var name = inputs[j].name || inputs[j].id || inputs[j].type;
          if (name) fields.push(name);
        }
        signals.push(action + '::' + fields.sort().join(','));
      }
      return signals.sort().join('|');
    },

    cookie_consent: function() {
      var selectors = ['[class*="cookie"]', '[id*="cookie"]', '[class*="consent"]', '[id*="consent"]', '[class*="gdpr"]', '[id*="gdpr"]'];
      var found = [];
      for (var s = 0; s < selectors.length; s++) {
        try {
          var els = document.querySelectorAll(selectors[s]);
          for (var e = 0; e < els.length; e++) {
            var tag = els[e].tagName.toLowerCase();
            if (tag !== 'script' && tag !== 'style') {
              found.push(tag + '::' + (els[e].className || '').substring(0, 50));
            }
          }
        } catch(ex) {}
      }
      return found.sort().join('|');
    },

    hipaa_references: function() {
      var text = (document.body.innerText || '').toLowerCase();
      var terms = ['hipaa', 'business associate agreement', 'baa', 'protected health information', 'phi', 'notice of privacy practices', 'npp'];
      var found = [];
      for (var i = 0; i < terms.length; i++) {
        if (text.indexOf(terms[i]) !== -1) found.push(terms[i]);
      }
      return found.sort().join('|');
    },

    meta_compliance: function() {
      var metas = document.querySelectorAll('meta');
      var found = [];
      var keywords = ['compliance', 'hipaa', 'privacy', 'data-processing', 'ai-usage', 'sovereignty', 'data-residency'];
      for (var i = 0; i < metas.length; i++) {
        var name = ((metas[i].name || '') + (metas[i].httpEquiv || '')).toLowerCase();
        for (var k = 0; k < keywords.length; k++) {
          if (name.indexOf(keywords[k]) !== -1) {
            found.push(name + '::' + (metas[i].content || '').substring(0, 100));
          }
        }
      }
      return found.sort().join('|');
    }
  };

  // ── Run all extractors and hash ──
  function extractAndHash(callback) {
    var categories = Object.keys(driftExtractors);
    var results = {};
    var pending = categories.length;

    categories.forEach(function(catId) {
      try {
        var content = driftExtractors[catId]();
        sha256(content || '').then(function(hash) {
          results[catId] = { hash: hash, content: (content || '').substring(0, 500), empty: !content };
          pending--;
          if (pending === 0) callback(results);
        });
      } catch(e) {
        results[catId] = { hash: 'error', content: '', empty: true };
        pending--;
        if (pending === 0) callback(results);
      }
    });
  }

  // ── Compare current hashes against baseline ──
  function detectDrift(current, baseline) {
    var drifts = [];
    if (!baseline) return drifts;

    var categories = Object.keys(current);
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var curr = current[cat];
      var base = baseline[cat];

      if (!base) {
        if (!curr.empty) {
          drifts.push({ category: cat, drift_type: 'content_added', previous_hash: null, current_hash: curr.hash, content_after: curr.content });
        }
      } else if (curr.empty && !base.empty) {
        drifts.push({ category: cat, drift_type: 'content_removed', previous_hash: base.hash, current_hash: curr.hash, content_before: base.content, content_after: '' });
      } else if (curr.hash !== base.hash) {
        drifts.push({ category: cat, drift_type: 'content_changed', previous_hash: base.hash, current_hash: curr.hash, content_before: base.content, content_after: curr.content });
      }
    }

    // Check for categories removed from page
    if (baseline) {
      var baseCategories = Object.keys(baseline);
      for (var b = 0; b < baseCategories.length; b++) {
        if (!current[baseCategories[b]]) {
          drifts.push({ category: baseCategories[b], drift_type: 'content_removed', previous_hash: baseline[baseCategories[b]].hash, current_hash: null, content_before: baseline[baseCategories[b]].content, content_after: '' });
        }
      }
    }

    return drifts;
  }

  // ── Report drift ──
  function reportDrift(drifts) {
    if (drifts.length === 0) return;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', DRIFT_API + '/drift');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      npi: cfg.npi,
      page_url: window.location.pathname,
      widget_mode: cfg.mode,
      drifts: drifts,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent.substring(0, 200)
    }));
  }

  // ── Send heartbeat ──
  function sendHeartbeat(hashes) {
    var now = Date.now();
    if (now - lastHeartbeat < HEARTBEAT_INTERVAL_MS) return;
    lastHeartbeat = now;

    var categoryHashes = {};
    if (hashes) {
      var cats = Object.keys(hashes);
      for (var i = 0; i < cats.length; i++) {
        categoryHashes[cats[i]] = hashes[cats[i]].hash;
      }
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', DRIFT_API + '/heartbeat');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      npi: cfg.npi,
      page_url: window.location.pathname,
      widget_mode: cfg.mode,
      category_hashes: categoryHashes,
      timestamp: new Date().toISOString()
    }));
  }

  // ── Drift engine main ──
  function runDriftEngine() {
    // Fetch baseline
    fetch(DRIFT_API + '/baseline?npi=' + encodeURIComponent(cfg.npi) + '&page_url=' + encodeURIComponent(window.location.pathname))
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        var baselineData = data ? data.baselines : null;

        // Extract and hash current content
        extractAndHash(function(currentHashes) {
          var drifts = detectDrift(currentHashes, baselineData);

          if (drifts.length > 0) {
            reportDrift(drifts);
          }

          sendHeartbeat(currentHashes);
        });
      })
      .catch(function() {
        // Baseline fetch failed — still send heartbeat
        extractAndHash(function(currentHashes) {
          sendHeartbeat(currentHashes);
        });
      });
  }

  // ══════════════════════════════════════════════════════════
  // MAIN ENTRY
  // ══════════════════════════════════════════════════════════

  // ── Public API ──
  window.KairoLogicSentry = {
    version: VERSION,
    refresh: function() {
      var el = document.getElementById('kl-sentry');
      if (el) el.remove();
      init();
    },
    hide: function() {
      var el = document.getElementById('kl-sentry');
      if (el) el.classList.add('kl-hidden');
    },
    show: function() {
      var el = document.getElementById('kl-sentry');
      if (el) el.classList.remove('kl-hidden');
    },
    triggerDriftCheck: function() {
      runDriftEngine();
    }
  };

  // Start badge UI
  init();

  // Start drift engine (delayed to not block page load)
  if (window.requestIdleCallback) {
    window.requestIdleCallback(runDriftEngine, { timeout: 5000 });
  } else {
    setTimeout(runDriftEngine, 3000);
  }

})();
