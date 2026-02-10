/**
 * KairoLogic Sentry Compliance Widget v2.1
 * =========================================
 * Glassmorphism trust badge + compliance drift detection engine.
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

  var VERSION = '2.1.0';
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
  // PART 1: BADGE UI (from v1)
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
    + '@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap");'

    + '#kl-sentry { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.4; box-sizing: border-box; z-index: 99999; }'
    + '#kl-sentry * { box-sizing: border-box; margin: 0; padding: 0; }'

    + '#kl-sentry.kl-pos-bottom-right { position: fixed; bottom: 16px; right: 16px; }'
    + '#kl-sentry.kl-pos-bottom-left  { position: fixed; bottom: 16px; left: 16px; }'
    + '#kl-sentry.kl-pos-inline        { position: relative; display: inline-block; }'
    + '#kl-sentry.kl-hidden { display: none !important; }'

    // Badge
    + '.kl-badge { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 10px; cursor: pointer; user-select: none; -webkit-user-select: none; transition: all 0.25s ease; max-width: 240px; }'
    + '.kl-badge:hover { transform: translateY(-1px); }'

    // Light glass
    + '.kl-light .kl-badge { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(10,25,47,0.08); border-left: 4px solid #FF6700; box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04); }'
    + '.kl-light .kl-badge:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.12); }'

    // Dark glass
    + '.kl-dark .kl-badge { background: rgba(15,23,42,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid #FF6700; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }'
    + '.kl-dark .kl-badge:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.4); }'

    // Icon box
    + '.kl-icon-box { width: 30px; height: 30px; background: #0A192F; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; }'
    + '.kl-icon-box svg { width: 16px; height: 16px; color: #fff; }'

    // Shield pulse (Shield mode)
    + '.kl-pulse-dot { position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; }'
    + '.kl-pulse-ring { position: absolute; inset: 0; border-radius: 50%; background: #22c55e; opacity: 0.6; animation: klPulse 2s ease-out infinite; }'
    + '.kl-pulse-core { position: relative; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; border: 1.5px solid #fff; }'
    + '.kl-dark .kl-pulse-core { border-color: #0f172a; }'
    + '@keyframes klPulse { 0% { transform: scale(1); opacity: 0.6; } 70% { transform: scale(2.2); opacity: 0; } 100% { transform: scale(2.2); opacity: 0; } }'

    // Watch dot (static)
    + '.kl-watch-dot { position: absolute; top: -1px; right: -1px; width: 7px; height: 7px; border-radius: 50%; background: #3b82f6; border: 1.5px solid #fff; }'
    + '.kl-dark .kl-watch-dot { border-color: #0f172a; }'

    // Badge text
    + '.kl-badge-brand { font-size: 10px; font-weight: 800; letter-spacing: 0.3px; white-space: nowrap; }'
    + '.kl-light .kl-badge-brand { color: #0A192F; }'
    + '.kl-dark .kl-badge-brand { color: #e2e8f0; }'
    + '.kl-badge-status { font-size: 9px; font-weight: 600; }'
    + '.kl-badge-id { font-size: 8px; font-family: "JetBrains Mono", monospace; letter-spacing: 0.5px; }'
    + '.kl-light .kl-badge-status { color: #16a34a; }'
    + '.kl-dark .kl-badge-status { color: #4ade80; }'
    + '.kl-light .kl-badge-id { color: #94a3b8; }'
    + '.kl-dark .kl-badge-id { color: #64748b; }'

    // Chevron
    + '.kl-info-btn { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.25s ease; flex-shrink: 0; margin-left: auto; }'
    + '.kl-light .kl-info-btn { background: rgba(10,25,47,0.04); }'
    + '.kl-dark .kl-info-btn { background: rgba(255,255,255,0.06); }'
    + '.kl-info-btn svg { width: 10px; height: 10px; transition: transform 0.25s ease; }'
    + '.kl-light .kl-info-btn svg { color: #64748b; }'
    + '.kl-dark .kl-info-btn svg { color: #94a3b8; }'
    + '.kl-info-btn.kl-open svg { transform: rotate(180deg); }'

    // Pane (expandable)
    + '.kl-pane { max-height: 0; overflow: hidden; transition: max-height 0.35s ease, opacity 0.25s ease; opacity: 0; margin-top: 0; }'
    + '.kl-pane.kl-open { max-height: 500px; opacity: 1; margin-top: 8px; }'
    + '.kl-pane-inner { border-radius: 12px; padding: 14px; }'
    + '.kl-light .kl-pane-inner { background: rgba(255,255,255,0.97); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(10,25,47,0.06); box-shadow: 0 8px 32px rgba(0,0,0,0.08); }'
    + '.kl-dark .kl-pane-inner { background: rgba(15,23,42,0.95); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }'

    // Trust items
    + '.kl-trust-item { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; }'
    + '.kl-trust-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }'
    + '.kl-trust-icon svg { width: 12px; height: 12px; }'
    + '.kl-trust-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }'
    + '.kl-light .kl-trust-label { color: #64748b; }'
    + '.kl-dark .kl-trust-label { color: #94a3b8; }'
    + '.kl-trust-value { font-size: 10px; font-weight: 500; margin-top: 1px; }'
    + '.kl-light .kl-trust-value { color: #475569; }'
    + '.kl-dark .kl-trust-value { color: #cbd5e1; }'

    // Category bars
    + '.kl-cat-bar-track { flex: 1; height: 4px; border-radius: 2px; overflow: hidden; }'
    + '.kl-light .kl-cat-bar-track { background: rgba(10,25,47,0.06); }'
    + '.kl-dark .kl-cat-bar-track { background: rgba(255,255,255,0.08); }'
    + '.kl-cat-bar-fill { height: 100%; border-radius: 2px; transition: width 0.8s ease; }'
    + '.kl-cat-score { font-size: 10px; font-weight: 700; font-family: "JetBrains Mono", monospace; min-width: 28px; text-align: right; }'

    // Summary row
    + '.kl-summary-row { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(128,128,128,0.1); }'
    + '.kl-stat { text-align: center; flex: 1; }'
    + '.kl-stat-val { font-size: 16px; font-weight: 800; font-family: "JetBrains Mono", monospace; }'
    + '.kl-stat-lbl { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }'
    + '.kl-light .kl-stat-lbl { color: #94a3b8; }'
    + '.kl-dark .kl-stat-lbl { color: #64748b; }'

    // CTA
    + '.kl-pane-cta { display: block; text-align: center; font-size: 10px; font-weight: 700; text-decoration: none; padding: 8px; border-radius: 8px; margin-top: 10px; transition: all 0.2s; background: #FF6700; color: white; }'
    + '.kl-pane-cta:hover { background: #e55b00; transform: translateY(-1px); }'
    + '.kl-pane-footer { text-align: center; margin-top: 8px; }'
    + '.kl-pane-footer a { font-size: 8px; text-decoration: none; font-weight: 600; }'
    + '.kl-light .kl-pane-footer a { color: #94a3b8; }'
    + '.kl-dark .kl-pane-footer a { color: #64748b; }';

  // ── SVG Icons ──
  var ico = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
    server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="18" r="1" fill="currentColor"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  };

  // ── Init UI ──
  function init() {
    fetchWidgetData(cfg.npi, function(data) {
      var theme = detectTheme();
      var status = data ? data.status : 'unregistered';
      var lastScan = data && data.last_scan ? new Date(data.last_scan).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not yet scanned';

      var statusText = status === 'verified' ? (isShield ? 'Shield Active' : 'Verified Compliant') : 'Compliance Unknown';
      var opts = { mode: cfg.mode, status: status, statusText: statusText };

      // Build HTML
      var html = buildBadge(theme, opts);
      if (status === 'verified') {
        html += buildTrustPane(theme, data, lastScan);
      } else {
        html += buildUnregisteredPane(theme);
      }

      // Create shadow-like container
      var root = document.createElement('div');
      root.id = 'kl-sentry';
      root.className = 'kl-' + theme + ' kl-pos-' + cfg.position;

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

  function buildTrustPane(theme, data, lastScan) {
    var score = data.compliance_score || 0;

    return ''
      + '<div class="kl-pane" id="kl-pane">'
      +   '<div class="kl-pane-inner">'
      +     '<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid rgba(128,128,128,0.1);">'
      +       '<span class="kl-trust-label" style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Compliance Status</span>'
      +       '<span class="kl-badge-id" style="font-size:9px;font-weight:600;">Scanned: ' + lastScan + '</span>'
      +     '</div>'
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
      +     '<div class="kl-summary-row">'
      +       '<div class="kl-stat"><div class="kl-stat-val" style="color:#16a34a" id="kl-s-pass">\u2014</div><div class="kl-stat-lbl">Passed</div></div>'
      +       '<div class="kl-stat"><div class="kl-stat-val" style="color:#d97706" id="kl-s-warn">\u2014</div><div class="kl-stat-lbl">Advisory</div></div>'
      +       '<div class="kl-stat"><div class="kl-stat-val" style="color:#dc2626" id="kl-s-fail">\u2014</div><div class="kl-stat-lbl">Issues</div></div>'
      +       '<div class="kl-stat"><div class="kl-stat-val" style="color:#0A192F" id="kl-s-score">' + score + '</div><div class="kl-stat-lbl">Score</div></div>'
      +     '</div>'
      +     '<a class="kl-pane-cta" href="' + API_BASE + '/scan/results?npi=' + cfg.npi + '&mode=verified" target="_blank" rel="noopener">View Full Compliance Report</a>'
      +     '<div class="kl-pane-footer"><a href="' + API_BASE + '" target="_blank" rel="noopener">Powered by KairoLogic Sentry ' + (isShield ? 'Shield' : 'Watch') + '</a></div>'
      +   '</div>'
      + '</div>';
  }

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

  // ══════════════════════════════════════════════════════════
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
