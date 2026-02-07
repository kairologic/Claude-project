/**
 * KairoLogic Sentry Compliance Widget v2.0
 * Glassmorphism design — embeddable on any healthcare practice site
 * 
 * Usage:
 * <script src="https://kairologic.com/sentry.js" data-npi="1234567890" data-mode="shield"></script>
 * 
 * Attributes:
 *   data-npi       Required. 10-digit NPI.
 *   data-mode      "watch" (default) or "shield"
 *   data-position  "bottom-right" (default), "bottom-left", "inline"
 *   data-theme     "auto" (default), "light", "dark"
 */
(function() {
  'use strict';

  var VERSION = '2.0.0';
  var API_BASE = window.KAIROLOGIC_API_URL || 'https://kairlogic-website.vercel.app';

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
    mode:     scriptTag.getAttribute('data-mode') || 'watch',         // watch | shield
    position: scriptTag.getAttribute('data-position') || 'bottom-right', // bottom-right | bottom-left | inline
    theme:    scriptTag.getAttribute('data-theme') || 'auto'          // auto | light | dark
  };

  if (!cfg.npi || cfg.npi.length !== 10) {
    console.error('[KairoLogic] Invalid NPI:', cfg.npi);
    return;
  }

  var isShield = cfg.mode === 'shield';

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
  var css = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap');

    #kl-sentry { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.4; box-sizing: border-box; z-index: 99999; }
    #kl-sentry * { box-sizing: border-box; margin: 0; padding: 0; }

    /* Position */
    #kl-sentry.kl-pos-bottom-right { position: fixed; bottom: 16px; right: 16px; }
    #kl-sentry.kl-pos-bottom-left  { position: fixed; bottom: 16px; left: 16px; }
    #kl-sentry.kl-pos-inline        { position: relative; display: inline-block; }

    /* ── Badge (collapsed) ── */
    .kl-badge {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px;
      border-radius: 10px;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      transition: all 0.25s ease;
      max-width: 240px;
    }
    .kl-badge:hover { transform: translateY(-1px); }

    /* Light glass */
    .kl-light .kl-badge {
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(10,25,47,0.08);
      border-left: 4px solid #FF6700;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
    }
    .kl-light .kl-badge:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.12); }

    /* Dark glass */
    .kl-dark .kl-badge {
      background: rgba(15,23,42,0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.08);
      border-left: 4px solid #FF6700;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    }
    .kl-dark .kl-badge:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.4); }

    /* Shield icon box */
    .kl-icon-box {
      width: 30px; height: 30px;
      background: #0A192F;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      position: relative;
    }
    .kl-icon-box svg { width: 16px; height: 16px; color: #fff; }

    /* Live pulse (Shield only) */
    .kl-pulse-dot {
      position: absolute; top: -2px; right: -2px;
      width: 8px; height: 8px;
    }
    .kl-pulse-ring {
      position: absolute; inset: 0;
      border-radius: 50%;
      background: #22c55e;
      opacity: 0.6;
      animation: klPulse 2s ease-out infinite;
    }
    .kl-pulse-core {
      position: relative;
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #22c55e;
      border: 1.5px solid #fff;
    }
    .kl-dark .kl-pulse-core { border-color: #0f172a; }

    @keyframes klPulse {
      0%   { transform: scale(1); opacity: 0.6; }
      70%  { transform: scale(2.2); opacity: 0; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    /* Watch dot (static, no pulse) */
    .kl-watch-dot {
      position: absolute; top: -1px; right: -1px;
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #3b82f6;
      border: 1.5px solid #fff;
    }
    .kl-dark .kl-watch-dot { border-color: #0f172a; }

    /* Text area */
    .kl-badge-text { flex: 1; min-width: 0; }
    .kl-badge-brand {
      font-size: 8px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.2px;
      color: #FF6700;
    }
    .kl-badge-status {
      font-size: 11px; font-weight: 700;
      line-height: 1.2;
    }
    .kl-light .kl-badge-status { color: #0A192F; }
    .kl-dark  .kl-badge-status { color: #f1f5f9; }

    .kl-badge-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      margin-top: 1px;
    }
    .kl-light .kl-badge-id { color: #94a3b8; }
    .kl-dark  .kl-badge-id { color: #64748b; }

    /* Info button */
    .kl-info-btn {
      padding-left: 8px;
      border-left: 1px solid rgba(128,128,128,0.12);
      display: flex; align-items: center;
      flex-shrink: 0;
    }
    .kl-info-btn svg {
      width: 12px; height: 12px;
      transition: color 0.2s, transform 0.3s;
    }
    .kl-light .kl-info-btn svg { color: #94a3b8; }
    .kl-dark  .kl-info-btn svg { color: #475569; }
    .kl-badge:hover .kl-info-btn svg { color: #0A192F; }
    .kl-dark .kl-badge:hover .kl-info-btn svg { color: #e2e8f0; }
    .kl-info-btn.kl-open svg { transform: rotate(180deg); }

    /* ── Trust Pane (expanded) ── */
    .kl-pane {
      max-height: 0; overflow: hidden; opacity: 0;
      transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, margin 0.3s ease;
      margin-top: 0;
    }
    .kl-pane.kl-open {
      max-height: 500px; opacity: 1; margin-top: 8px;
    }
    .kl-pane-inner {
      border-radius: 12px;
      padding: 16px;
    }
    .kl-light .kl-pane-inner {
      background: rgba(255,255,255,0.97);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(10,25,47,0.06);
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .kl-dark .kl-pane-inner {
      background: rgba(15,23,42,0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    }

    /* Trust items */
    .kl-trust-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 8px 0;
    }
    .kl-trust-item + .kl-trust-item {
      border-top: 1px solid rgba(128,128,128,0.1);
    }
    .kl-trust-icon {
      width: 28px; height: 28px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-size: 14px;
    }
    .kl-trust-label {
      font-size: 11px; font-weight: 600;
    }
    .kl-light .kl-trust-label { color: #1e293b; }
    .kl-dark  .kl-trust-label { color: #e2e8f0; }

    .kl-trust-value {
      font-size: 10px;
      margin-top: 1px;
    }
    .kl-light .kl-trust-value { color: #64748b; }
    .kl-dark  .kl-trust-value { color: #94a3b8; }

    /* Category bars */
    .kl-cat-bar-track {
      flex: 1; height: 4px; border-radius: 2px; overflow: hidden; margin-top: 4px;
    }
    .kl-light .kl-cat-bar-track { background: #e2e8f0; }
    .kl-dark  .kl-cat-bar-track { background: #334155; }

    .kl-cat-bar-fill {
      height: 100%; border-radius: 2px;
      transition: width 0.8s ease;
    }

    .kl-cat-score {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px; font-weight: 700;
      min-width: 28px; text-align: right;
    }

    /* Summary row */
    .kl-summary-row {
      display: flex; justify-content: center; gap: 20px;
      padding-top: 10px; margin-top: 8px;
    }
    .kl-light .kl-summary-row { border-top: 1px solid rgba(10,25,47,0.06); }
    .kl-dark  .kl-summary-row { border-top: 1px solid rgba(255,255,255,0.06); }

    .kl-stat { text-align: center; }
    .kl-stat-val { font-size: 16px; font-weight: 800; line-height: 1; }
    .kl-stat-lbl { font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .kl-light .kl-stat-lbl { color: #94a3b8; }
    .kl-dark  .kl-stat-lbl { color: #64748b; }

    /* CTA link */
    .kl-pane-cta {
      display: block; text-align: center;
      margin-top: 12px; padding: 8px 12px;
      border-radius: 8px;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .kl-light .kl-pane-cta { background: #0A192F; color: #fff; }
    .kl-light .kl-pane-cta:hover { background: #0f2744; }
    .kl-dark  .kl-pane-cta { background: #FF6700; color: #fff; }
    .kl-dark  .kl-pane-cta:hover { background: #e55a00; }

    /* Footer */
    .kl-pane-footer {
      text-align: center; margin-top: 8px;
      font-size: 8px; letter-spacing: 0.3px;
    }
    .kl-pane-footer a { text-decoration: none; transition: color 0.2s; }
    .kl-light .kl-pane-footer a { color: #94a3b8; }
    .kl-light .kl-pane-footer a:hover { color: #FF6700; }
    .kl-dark  .kl-pane-footer a { color: #475569; }
    .kl-dark  .kl-pane-footer a:hover { color: #FF6700; }

    /* Hidden */
    #kl-sentry.kl-hidden { display: none !important; }

    /* Mobile */
    @media (max-width: 480px) {
      #kl-sentry.kl-pos-bottom-right, #kl-sentry.kl-pos-bottom-left {
        right: 8px; left: 8px; bottom: 8px;
      }
      .kl-badge { max-width: none; }
    }
  `;

  // ── Icons ──
  var ico = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    server: '\uD83D\uDDA5\uFE0F',   // 🖥️
    ai: '\uD83E\uDD16',              // 🤖
    clock: '\u23F0',                  // ⏰
    check: '\u2705',                  // ✅
  };

  // ── Helpers ──
  function fmtDate(d) {
    if (!d) return 'Recently';
    try {
      var dt = new Date(d), now = new Date();
      var diff = Math.floor((now - dt) / 3600000); // hours
      if (diff < 1) return 'Just now';
      if (diff < 24) return diff + 'h ago';
      var days = Math.floor(diff / 24);
      if (days === 1) return 'Yesterday';
      if (days < 7) return days + 'd ago';
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch(e) { return 'Recently'; }
  }

  // ── Build widget ──
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Inject styles
    var styleEl = document.createElement('style');
    styleEl.id = 'kl-sentry-css';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // Create root
    var theme = detectTheme();
    var root = document.createElement('div');
    root.id = 'kl-sentry';
    root.className = 'kl-pos-' + cfg.position + ' kl-' + theme;

    // Show loading badge
    root.innerHTML = buildBadge(theme, {
      status: 'loading',
      statusText: 'Verifying\u2026',
      id: 'TX-SB1188-' + cfg.npi,
      mode: cfg.mode
    });

    document.body.appendChild(root);

    // Fetch data
    fetchData(cfg.npi).then(function(data) {
      if (!data) {
        root.classList.add('kl-hidden');
        return;
      }
      if (data.widget_status === 'hidden') {
        root.classList.add('kl-hidden');
        return;
      }
      if (data.widget_status === 'not_registered') {
        root.innerHTML = buildBadge(theme, {
          status: 'unregistered',
          statusText: 'Not Verified',
          id: 'TX-SB1188-' + cfg.npi,
          mode: cfg.mode
        }) + buildUnregisteredPane(theme);
        wireToggle(root);
        return;
      }

      // Verified
      var lastScan = fmtDate(data.last_scan_timestamp || data.updated_at);
      root.innerHTML = buildBadge(theme, {
        status: 'verified',
        statusText: isShield ? 'Verified Sovereign' : 'Monitored',
        id: 'TX-SB1188-' + cfg.npi,
        mode: cfg.mode
      }) + buildTrustPane(theme, data, lastScan);
      wireToggle(root);
    });
  }

  // ── Badge HTML ──
  function buildBadge(theme, opts) {
    var dotHtml = '';
    if (opts.mode === 'shield' && opts.status === 'verified') {
      dotHtml = '<div class="kl-pulse-dot"><span class="kl-pulse-ring"></span><span class="kl-pulse-core"></span></div>';
    } else if (opts.status === 'verified') {
      dotHtml = '<div class="kl-watch-dot"></div>';
    }

    return ''
      + '<div class="kl-badge" id="kl-badge" role="button" tabindex="0" aria-expanded="false">'
      +   '<div class="kl-icon-box">'
      +     ico.shield
      +     dotHtml
      +   '</div>'
      +   '<div class="kl-badge-text">'
      +     '<div class="kl-badge-brand">KairoLogic\u2122 ' + (opts.status === 'verified' ? 'Certified' : 'Sentry') + '</div>'
      +     '<div class="kl-badge-status">' + opts.statusText + '</div>'
      +     '<div class="kl-badge-id">TX-SB1188-' + cfg.npi.slice(-6) + '</div>'
      +   '</div>'
      +   '<div class="kl-info-btn" id="kl-info-btn">' + ico.chevron + '</div>'
      + '</div>';
  }

  // ── Trust Pane (verified) ──
  function buildTrustPane(theme, data, lastScan) {
    var score = data.compliance_score || 0;

    return ''
      + '<div class="kl-pane" id="kl-pane">'
      +   '<div class="kl-pane-inner">'

      // Scan timestamp header
      +     '<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid rgba(128,128,128,0.1);">'
      +       '<span class="kl-trust-label" style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Compliance Status</span>'
      +       '<span class="kl-badge-id" style="font-size:9px;font-weight:600;">Scanned: ' + lastScan + '</span>'
      +     '</div>'

      // Trust items
      +     '<div class="kl-trust-item">'
      +       '<div class="kl-trust-icon" style="background:rgba(59,130,246,0.1)">' + ico.server + '</div>'
      +       '<div style="flex:1">'
      +         '<div class="kl-trust-label">Data Residency</div>'
      +         '<div class="kl-trust-value">Data hosted on US-based sovereign infrastructure</div>'
      +         '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">'
      +           '<div class="kl-cat-bar-track"><div class="kl-cat-bar-fill" id="kl-bar-dr" style="width:0%;background:#3b82f6;"></div></div>'
      +           '<span class="kl-cat-score" id="kl-val-dr" style="color:#3b82f6;">\u2014</span>'
      +         '</div>'
      +       '</div>'
      +     '</div>'

      +     '<div class="kl-trust-item">'
      +       '<div class="kl-trust-icon" style="background:rgba(245,158,11,0.1)">' + ico.ai + '</div>'
      +       '<div style="flex:1">'
      +         '<div class="kl-trust-label">AI Transparency</div>'
      +         '<div class="kl-trust-value">AI interactions verified and properly disclosed</div>'
      +         '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">'
      +           '<div class="kl-cat-bar-track"><div class="kl-cat-bar-fill" id="kl-bar-ai" style="width:0%;background:#f59e0b;"></div></div>'
      +           '<span class="kl-cat-score" id="kl-val-ai" style="color:#f59e0b;">\u2014</span>'
      +         '</div>'
      +       '</div>'
      +     '</div>'

      +     '<div class="kl-trust-item">'
      +       '<div class="kl-trust-icon" style="background:rgba(34,197,94,0.1)">' + ico.clock + '</div>'
      +       '<div>'
      +         '<div class="kl-trust-label">Last Verification</div>'
      +         '<div class="kl-trust-value">'
      +           '<span style="font-family:\'JetBrains Mono\',monospace;font-weight:700;">' + lastScan + '</span>'
      +           (isShield ? ' \u2022 Live monitoring active' : ' \u2022 Monthly scans')
      +         '</div>'
      +       '</div>'
      +     '</div>'

      // Pass/Warn/Fail summary
      +     '<div class="kl-summary-row">'
      +       '<div class="kl-stat"><div class="kl-stat-val" style="color:#16a34a" id="kl-s-pass">\u2014</div><div class="kl-stat-lbl">Passed</div></div>'
      +       '<div class="kl-stat"><div class="kl-stat-val" style="color:#d97706" id="kl-s-warn">\u2014</div><div class="kl-stat-lbl">Advisory</div></div>'
      +       '<div class="kl-stat"><div class="kl-stat-val" style="color:#dc2626" id="kl-s-fail">\u2014</div><div class="kl-stat-lbl">Issues</div></div>'
      +       '<div class="kl-stat"><div class="kl-stat-val" style="color:#0A192F" id="kl-s-score">' + score + '</div><div class="kl-stat-lbl">Score</div></div>'
      +     '</div>'

      // CTA
      +     '<a class="kl-pane-cta" href="' + API_BASE + '/scan/results?npi=' + cfg.npi + '&mode=verified" target="_blank" rel="noopener">View Full Compliance Report</a>'
      +     '<div class="kl-pane-footer"><a href="' + API_BASE + '" target="_blank" rel="noopener">Powered by KairoLogic Sentry ' + (isShield ? 'Shield' : 'Watch') + '</a></div>'
      +   '</div>'
      + '</div>';
  }

  // ── Unregistered Pane ──
  function buildUnregisteredPane(theme) {
    return ''
      + '<div class="kl-pane" id="kl-pane">'
      +   '<div class="kl-pane-inner" style="text-align:center;padding:20px;">'
      +     '<div style="font-size:11px;font-weight:600;margin-bottom:6px;" class="kl-trust-label">This practice has not yet been verified</div>'
      +     '<div style="font-size:10px;margin-bottom:12px;" class="kl-trust-value">Run a free compliance scan to verify SB 1188 & HB 149 compliance.</div>'
      +     '<a class="kl-pane-cta" href="' + API_BASE + '/scan?npi=' + cfg.npi + '" target="_blank" rel="noopener">Run Free Scan</a>'
      +     '<div class="kl-pane-footer"><a href="' + API_BASE + '" target="_blank" rel="noopener">Powered by KairoLogic</a></div>'
      +   '</div>'
      + '</div>';
  }

  // ── Wire toggle ──
  function wireToggle(root) {
    var badge = root.querySelector('#kl-badge');
    var pane = root.querySelector('#kl-pane');
    var btn = root.querySelector('#kl-info-btn');
    if (!badge || !pane) return;

    var loaded = false;
    function toggle() {
      var isOpen = pane.classList.contains('kl-open');
      if (isOpen) {
        pane.classList.remove('kl-open');
        if (btn) btn.classList.remove('kl-open');
        badge.setAttribute('aria-expanded', 'false');
      } else {
        pane.classList.add('kl-open');
        if (btn) btn.classList.add('kl-open');
        badge.setAttribute('aria-expanded', 'true');
        if (!loaded) {
          loaded = true;
          loadDetails(cfg.npi);
        }
      }
    }
    badge.addEventListener('click', toggle);
    badge.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  }

  // ── Lazy-load detailed report data ──
  function loadDetails(npi) {
    fetch(API_BASE + '/api/report?npi=' + npi, { headers: { 'Accept': 'application/json' } })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(reports) {
        if (!reports || !Array.isArray(reports) || !reports.length) return;
        var rpt = reports[0];

        // Category bars
        if (rpt.category_scores) {
          var cs = rpt.category_scores;
          setBar('kl-bar-dr', 'kl-val-dr', cs.dataResidency && cs.dataResidency.percentage || 0);
          setBar('kl-bar-ai', 'kl-val-ai', cs.aiTransparency && cs.aiTransparency.percentage || 0);
        }

        // Pass / warn / fail counts
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

  // ── Fetch widget data ──
  function fetchData(npi) {
    return fetch(API_BASE + '/api/widget/' + npi, { headers: { 'Accept': 'application/json' } })
      .then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; });
  }

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
    }
  };

  // Start
  init();

})();
