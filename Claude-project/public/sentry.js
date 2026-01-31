/**
 * KairoLogic Sentry Compliance Widget
 * Embeddable script for healthcare practice websites
 * Version: 1.0.0
 * 
 * Usage:
 * <script src="https://yoursite.com/sentry.js" data-npi="1234567890"></script>
 * 
 * Optional attributes:
 * - data-npi: Required. The 10-digit NPI number
 * - data-position: "bottom-right" (default), "bottom-left", "inline"
 * - data-theme: "light" (default), "dark"
 * - data-size: "standard" (default), "compact", "badge-only"
 */

(function() {
  'use strict';

  // Configuration
  const WIDGET_VERSION = '1.0.0';
  const API_BASE_URL = window.KAIROLOGIC_API_URL || 'https://kairlogic-website.vercel.app';
  
  // Find the script tag to get configuration
  const scriptTag = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.includes('sentry.js')) {
        return scripts[i];
      }
    }
    return null;
  })();

  if (!scriptTag) {
    console.error('[KairoLogic Sentry] Could not find script tag');
    return;
  }

  // Get configuration from data attributes
  const config = {
    npi: scriptTag.getAttribute('data-npi'),
    position: scriptTag.getAttribute('data-position') || 'bottom-right',
    theme: scriptTag.getAttribute('data-theme') || 'light',
    size: scriptTag.getAttribute('data-size') || 'standard'
  };

  if (!config.npi || config.npi.length !== 10) {
    console.error('[KairoLogic Sentry] Invalid or missing NPI. Please provide a valid 10-digit NPI.');
    return;
  }

  // Styles
  const styles = `
    .kl-sentry-widget {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.4;
      box-sizing: border-box;
      z-index: 9999;
    }
    
    .kl-sentry-widget * {
      box-sizing: border-box;
    }
    
    /* Position variants */
    .kl-sentry-widget.kl-position-bottom-right {
      position: fixed;
      bottom: 20px;
      right: 20px;
    }
    
    .kl-sentry-widget.kl-position-bottom-left {
      position: fixed;
      bottom: 20px;
      left: 20px;
    }
    
    .kl-sentry-widget.kl-position-inline {
      position: relative;
      display: inline-block;
    }
    
    /* Main container */
    .kl-sentry-container {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      transition: all 0.3s ease;
      max-width: 320px;
      min-width: 280px;
    }
    
    .kl-sentry-container:hover {
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
      transform: translateY(-2px);
    }
    
    /* Dark theme */
    .kl-theme-dark .kl-sentry-container {
      background: #1a1a2e;
      color: #ffffff;
    }
    
    /* Header */
    .kl-sentry-header {
      background: linear-gradient(135deg, #00234E 0%, #0a3a7a 100%);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .kl-sentry-logo {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
    }
    
    .kl-sentry-logo svg {
      width: 100%;
      height: 100%;
    }
    
    .kl-sentry-title {
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .kl-sentry-subtitle {
      color: #C5A059;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* Body */
    .kl-sentry-body {
      padding: 16px;
    }
    
    /* Status row */
    .kl-sentry-status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    
    .kl-sentry-status {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .kl-sentry-status-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .kl-sentry-status-icon.kl-status-compliant {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .kl-sentry-status-icon.kl-status-warning {
      background: #fef3c7;
      color: #d97706;
    }
    
    .kl-sentry-status-icon.kl-status-critical {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .kl-sentry-status-icon svg {
      width: 14px;
      height: 14px;
    }
    
    .kl-sentry-status-text {
      font-size: 13px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .kl-theme-dark .kl-sentry-status-text {
      color: #f3f4f6;
    }
    
    /* Score */
    .kl-sentry-score {
      text-align: right;
    }
    
    .kl-sentry-score-value {
      font-size: 28px;
      font-weight: 800;
      line-height: 1;
    }
    
    .kl-sentry-score-value.kl-score-high {
      color: #16a34a;
    }
    
    .kl-sentry-score-value.kl-score-medium {
      color: #d97706;
    }
    
    .kl-sentry-score-value.kl-score-low {
      color: #dc2626;
    }
    
    .kl-sentry-score-label {
      font-size: 9px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    
    /* Progress bar */
    .kl-sentry-progress {
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    
    .kl-sentry-progress-bar {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s ease;
    }
    
    .kl-sentry-progress-bar.kl-score-high {
      background: linear-gradient(90deg, #16a34a, #22c55e);
    }
    
    .kl-sentry-progress-bar.kl-score-medium {
      background: linear-gradient(90deg, #d97706, #f59e0b);
    }
    
    .kl-sentry-progress-bar.kl-score-low {
      background: linear-gradient(90deg, #dc2626, #ef4444);
    }
    
    /* Info row */
    .kl-sentry-info {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    
    .kl-sentry-info-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .kl-sentry-info-item svg {
      width: 12px;
      height: 12px;
    }
    
    /* CTA Button */
    .kl-sentry-cta {
      display: block;
      width: 100%;
      padding: 10px 16px;
      background: linear-gradient(135deg, #FF6600 0%, #ff8533 100%);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      text-decoration: none;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .kl-sentry-cta:hover {
      background: linear-gradient(135deg, #e65c00 0%, #ff6600 100%);
      transform: translateY(-1px);
    }
    
    /* Verified CTA - Green theme */
    .kl-sentry-cta.kl-cta-verified {
      background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
    }
    
    .kl-sentry-cta.kl-cta-verified:hover {
      background: linear-gradient(135deg, #15803d 0%, #16a34a 100%);
    }
    
    /* Verified Badge Styles */
    .kl-sentry-verified-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%);
      border: 2px solid #16a34a;
      border-radius: 10px;
      margin-bottom: 14px;
    }
    
    .kl-sentry-verified-icon {
      width: 48px;
      height: 48px;
      background: #16a34a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .kl-sentry-verified-icon svg {
      width: 28px;
      height: 28px;
      color: #ffffff;
    }
    
    .kl-sentry-verified-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .kl-sentry-verified-label {
      font-size: 14px;
      font-weight: 800;
      color: #16a34a;
      letter-spacing: 0.5px;
    }
    
    .kl-sentry-verified-sublabel {
      font-size: 10px;
      font-weight: 600;
      color: #166534;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    /* Not Registered / Get Verified Styles */
    .kl-sentry-not-registered {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%);
      border: 2px solid #d97706;
      border-radius: 10px;
      margin-bottom: 12px;
    }
    
    .kl-sentry-nr-icon {
      width: 48px;
      height: 48px;
      background: #d97706;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .kl-sentry-nr-icon svg {
      width: 28px;
      height: 28px;
      color: #ffffff;
    }
    
    .kl-sentry-nr-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .kl-sentry-nr-label {
      font-size: 14px;
      font-weight: 800;
      color: #92400e;
      letter-spacing: 0.5px;
    }
    
    .kl-sentry-nr-sublabel {
      font-size: 10px;
      font-weight: 600;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .kl-sentry-nr-desc {
      font-size: 12px;
      color: #78716c;
      margin-bottom: 14px;
      line-height: 1.5;
    }
    
    /* Footer */
    .kl-sentry-footer {
      padding: 8px 16px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    
    .kl-theme-dark .kl-sentry-footer {
      background: #16162a;
      border-top-color: #2d2d4a;
    }
    
    .kl-sentry-footer-text {
      font-size: 9px;
      color: #9ca3af;
      text-decoration: none;
    }
    
    .kl-sentry-footer-text:hover {
      color: #C5A059;
    }
    
    /* Compact size */
    .kl-size-compact .kl-sentry-container {
      min-width: 200px;
      max-width: 240px;
    }
    
    .kl-size-compact .kl-sentry-header {
      padding: 8px 12px;
    }
    
    .kl-size-compact .kl-sentry-logo {
      width: 24px;
      height: 24px;
    }
    
    .kl-size-compact .kl-sentry-body {
      padding: 12px;
    }
    
    .kl-size-compact .kl-sentry-score-value {
      font-size: 22px;
    }
    
    /* Badge only */
    .kl-size-badge-only .kl-sentry-container {
      min-width: auto;
      max-width: none;
    }
    
    .kl-size-badge-only .kl-sentry-body,
    .kl-size-badge-only .kl-sentry-footer {
      display: none;
    }
    
    .kl-size-badge-only .kl-sentry-header {
      border-radius: 8px;
      cursor: pointer;
    }
    
    /* Loading state */
    .kl-sentry-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #6b7280;
      font-size: 12px;
    }
    
    .kl-sentry-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e5e7eb;
      border-top-color: #00234E;
      border-radius: 50%;
      animation: kl-spin 0.8s linear infinite;
      margin-right: 10px;
    }
    
    @keyframes kl-spin {
      to { transform: rotate(360deg); }
    }
    
    /* Error state */
    .kl-sentry-error {
      padding: 16px;
      text-align: center;
      color: #6b7280;
      font-size: 11px;
    }
    
    /* Hidden state */
    .kl-sentry-widget.kl-hidden {
      display: none !important;
    }
    
    /* Mobile responsive */
    @media (max-width: 480px) {
      .kl-sentry-widget.kl-position-bottom-right,
      .kl-sentry-widget.kl-position-bottom-left {
        bottom: 10px;
        right: 10px;
        left: 10px;
      }
      
      .kl-sentry-container {
        max-width: none;
        min-width: auto;
      }
    }
  `;

  // Icons
  const icons = {
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    shieldCheck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>`,
    alertTriangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    xCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    externalLink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
    logo: `<svg viewBox="0 0 48 48" fill="none"><defs><linearGradient id="klGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#C5A059"/><stop offset="100%" style="stop-color:#D4B068"/></linearGradient></defs><path d="M24 4L44 14V22C44 33.5 35.5 43.5 24 46C12.5 43.5 4 33.5 4 22V14L24 4Z" fill="#00234E" stroke="#C5A059" stroke-width="2"/><path d="M24 12L34 17V23C34 29.5 30 35 24 37C18 35 14 29.5 14 23V17L24 12Z" fill="url(#klGrad)" fill-opacity="0.3"/><path d="M18 24L22 28L30 20" stroke="#C5A059" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  };

  // Create widget container
  function createWidget() {
    // Inject styles
    const styleElement = document.createElement('style');
    styleElement.id = 'kl-sentry-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    // Create widget element
    const widget = document.createElement('div');
    widget.id = 'kl-sentry-widget';
    widget.className = `kl-sentry-widget kl-position-${config.position} kl-theme-${config.theme} kl-size-${config.size}`;
    
    // Show loading state
    widget.innerHTML = `
      <div class="kl-sentry-container">
        <div class="kl-sentry-header">
          <div class="kl-sentry-logo">${icons.logo}</div>
          <div>
            <div class="kl-sentry-title">KairoLogic</div>
            <div class="kl-sentry-subtitle">Sentry Verified</div>
          </div>
        </div>
        <div class="kl-sentry-loading">
          <div class="kl-sentry-spinner"></div>
          Verifying compliance...
        </div>
      </div>
    `;
    
    document.body.appendChild(widget);
    return widget;
  }

  // Fetch widget data
  async function fetchWidgetData(npi) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/widget/${npi}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[KairoLogic Sentry] Failed to fetch widget data:', error);
      return null;
    }
  }

  // Render widget with data
  function renderWidget(widget, data) {
    if (!data) {
      widget.innerHTML = `
        <div class="kl-sentry-container">
          <div class="kl-sentry-header">
            <div class="kl-sentry-logo">${icons.logo}</div>
            <div>
              <div class="kl-sentry-title">KairoLogic</div>
              <div class="kl-sentry-subtitle">Sentry Verified</div>
            </div>
          </div>
          <div class="kl-sentry-error">
            Unable to load compliance status.<br>
            <a href="${API_BASE_URL}/scan" style="color: #C5A059;">Run a scan →</a>
          </div>
        </div>
      `;
      return;
    }

    // Check if widget should be hidden (score below threshold or inactive)
    if (data.widget_status === 'hidden' || data.widget_status === 'inactive') {
      widget.classList.add('kl-hidden');
      return;
    }

    // NPI not in registry yet - show "Run Scan" prompt instead of hiding
    if (data.widget_status === 'not_registered') {
      widget.innerHTML = `
        <div class="kl-sentry-container">
          <div class="kl-sentry-header">
            <div class="kl-sentry-logo">${icons.logo}</div>
            <div>
              <div class="kl-sentry-title">KairoLogic</div>
              <div class="kl-sentry-subtitle">Sentry Standard</div>
            </div>
          </div>
          <div class="kl-sentry-body">
            <div class="kl-sentry-not-registered">
              <div class="kl-sentry-nr-icon">
                ${icons.shield}
              </div>
              <div class="kl-sentry-nr-text">
                <span class="kl-sentry-nr-label">GET VERIFIED</span>
                <span class="kl-sentry-nr-sublabel">Texas SB 1188 & HB 149</span>
              </div>
            </div>
            <p class="kl-sentry-nr-desc">
              Verify your compliance status with Texas healthcare data sovereignty requirements.
            </p>
            <a href="${API_BASE_URL}/scan?npi=${config.npi}" target="_blank" class="kl-sentry-cta">
              Run Free Compliance Scan
            </a>
          </div>
          <div class="kl-sentry-footer">
            <a href="${API_BASE_URL}" target="_blank" class="kl-sentry-footer-text">
              Powered by KairoLogic Sentry Standard
            </a>
          </div>
        </div>
      `;
      return;
    }

    // Widget is VERIFIED (only shown when score >= threshold)
    // Always display as green/verified status
    const isVerified = data.verified || data.widget_status === 'verified';
    
    // Format last scan date
    const lastScan = data.last_scan_timestamp || data.updated_at;
    const lastScanFormatted = lastScan ? formatDate(lastScan) : 'Recently';

    // Build VERIFIED widget HTML - simplified green status
    widget.innerHTML = `
      <div class="kl-sentry-container">
        <div class="kl-sentry-header">
          <div class="kl-sentry-logo">${icons.logo}</div>
          <div>
            <div class="kl-sentry-title">KairoLogic</div>
            <div class="kl-sentry-subtitle">Sentry Standard</div>
          </div>
        </div>
        <div class="kl-sentry-body">
          <div class="kl-sentry-verified-badge">
            <div class="kl-sentry-verified-icon">
              ${icons.shieldCheck}
            </div>
            <div class="kl-sentry-verified-text">
              <span class="kl-sentry-verified-label">COMPLIANCE VERIFIED</span>
              <span class="kl-sentry-verified-sublabel">Texas SB 1188 & HB 149</span>
            </div>
          </div>
          <div class="kl-sentry-info">
            <div class="kl-sentry-info-item">
              ${icons.clock}
              <span>Verified: ${lastScanFormatted}</span>
            </div>
            <div class="kl-sentry-info-item">
              ${icons.shield}
              <span>NPI: ****${config.npi.slice(-4)}</span>
            </div>
          </div>
          <a href="${API_BASE_URL}/scan/results?npi=${config.npi}&mode=verified" target="_blank" class="kl-sentry-cta kl-cta-verified">
            View Compliance Report
          </a>
        </div>
        <div class="kl-sentry-footer">
          <a href="${API_BASE_URL}" target="_blank" class="kl-sentry-footer-text">
            Powered by KairoLogic Sentry Standard
          </a>
        </div>
      </div>
    `;
  }

  // Helper: Format date
  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (e) {
      return 'Unknown';
    }
  }

  // Initialize widget
  async function init() {
    // Wait for DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    const widget = createWidget();
    const data = await fetchWidgetData(config.npi);
    renderWidget(widget, data);
  }

  // Start
  init();

  // Expose API for manual refresh
  window.KairoLogicSentry = {
    refresh: async function() {
      const widget = document.getElementById('kl-sentry-widget');
      if (widget) {
        const data = await fetchWidgetData(config.npi);
        renderWidget(widget, data);
      }
    },
    hide: function() {
      const widget = document.getElementById('kl-sentry-widget');
      if (widget) widget.classList.add('kl-hidden');
    },
    show: function() {
      const widget = document.getElementById('kl-sentry-widget');
      if (widget) widget.classList.remove('kl-hidden');
    },
    version: WIDGET_VERSION
  };

})();
