/**
 * chrome-extension/content/content.ts
 *
 * Content script that:
 * 1. Detects NPI from the current page
 * 2. Fetches corrections from KairoLogic API
 * 3. Injects a floating sidebar with pending corrections
 * 4. Provides copy-to-clipboard and "Mark as Corrected" functionality
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

interface Correction {
  field: string;
  incorrect_value: string;
  correct_value: string;
  workflow_id: string;
  system: string;
  correction_type: string;
}

interface CorrectionsResponse {
  provider_name: string;
  npi: string;
  pending_corrections: Correction[];
  total_pending: number;
}

interface StoredConfig {
  apiBaseUrl: string;
  authToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NPI Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect NPI from NPPES.CMS.HHS.GOV
 */
function detectNpiFromNPPES(): string | null {
  // NPPES uses query parameter: npi=<npi>
  const params = new URLSearchParams(window.location.search);
  return params.get('npi') || null;
}

/**
 * Detect NPI from PECOS.CMS.HHS.GOV
 */
function detectNpiFromPECOS(): string | null {
  // PECOS typically displays NPI in a field or in the URL
  // Try to find NPI field in the page
  const npiInput = document.querySelector(
    'input[name*="npi"], input[id*="npi"]',
  ) as HTMLInputElement;
  if (npiInput?.value) {
    return npiInput.value;
  }

  // Try to find in displayed text
  const pageText = document.body.innerText;
  const npiMatch = pageText.match(/NPI[:\s]+(\d{10})/i);
  return npiMatch ? npiMatch[1] : null;
}

/**
 * Detect NPI from CAQH ProView
 */
function detectNpiFromCAQH(): string | null {
  // CAQH displays NPI in various locations
  const npiElement = document.querySelector('[data-npi], [id*="npi"], [class*="npi"]');
  if (npiElement?.textContent) {
    const match = npiElement.textContent.match(/\d{10}/);
    if (match) return match[0];
  }

  // Try page text
  const pageText = document.body.innerText;
  const npiMatch = pageText.match(/(?:NPI|#)[:\s]*(\d{10})/i);
  return npiMatch ? npiMatch[1] : null;
}

/**
 * Detect NPI from payer portals (UnitedHealthcare, Aetna, etc)
 */
function detectNpiFromPayerPortal(): string | null {
  // Generic detection across payer portals
  const selectors = [
    'input[name*="npi"]',
    'input[id*="npi"]',
    '[data-field="npi"]',
    'span[class*="npi"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const value = (element as HTMLInputElement).value || element.textContent;
      if (value) {
        const match = value.match(/\d{10}/);
        if (match) return match[0];
      }
    }
  }

  // Try to extract from page text
  const pageText = document.body.innerText;
  const npiMatch = pageText.match(/(?:NPI|Provider #)[:\s]*(\d{10})/i);
  return npiMatch ? npiMatch[1] : null;
}

/**
 * Main NPI detection function
 */
function detectNPI(): string | null {
  const hostname = window.location.hostname;

  if (hostname.includes('nppes.cms.hhs.gov')) {
    return detectNpiFromNPPES();
  }

  if (hostname.includes('pecos.cms.hhs.gov')) {
    return detectNpiFromPECOS();
  }

  if (hostname.includes('caqh') || hostname.includes('proview')) {
    return detectNpiFromCAQH();
  }

  if (
    hostname.includes('aetna') ||
    hostname.includes('uhc') ||
    hostname.includes('availity') ||
    hostname.includes('cigna') ||
    hostname.includes('humana') ||
    hostname.includes('blueshield')
  ) {
    return detectNpiFromPayerPortal();
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Injection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inject floating sidebar with corrections
 */
function injectSidebar(corrections: CorrectionsResponse): void {
  // Remove existing sidebar if present
  const existing = document.getElementById('kairo-corrections-sidebar');
  if (existing) {
    existing.remove();
  }

  // Create container
  const sidebar = document.createElement('div');
  sidebar.id = 'kairo-corrections-sidebar';
  sidebar.style.cssText = `
    position: fixed;
    right: 0;
    top: 60px;
    width: 320px;
    max-height: 80vh;
    background: white;
    border-left: 1px solid #d1d8e0;
    border-top: 1px solid #d1d8e0;
    border-bottom: 1px solid #d1d8e0;
    box-shadow: -2px 2px 8px rgba(0,0,0,0.12);
    border-radius: 8px 0 0 8px;
    overflow-y: auto;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f1e2e;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    background: #0f1e2e;
    color: #d4a017;
    padding: 12px;
    font-weight: 600;
    font-size: 14px;
    border-bottom: 1px solid #1a3249;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.innerHTML = `
    <div>
      <div style="font-size: 12px; opacity: 0.8;">KairoLogic</div>
      <div>${corrections.total_pending} pending</div>
    </div>
    <button id="kairo-close-btn" style="
      background: none;
      border: none;
      color: #d4a017;
      cursor: pointer;
      font-size: 18px;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">×</button>
  `;

  sidebar.appendChild(header);

  // Close button handler
  const closeBtn = header.querySelector('#kairo-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      sidebar.style.display = 'none';
    });
  }

  // Body
  const body = document.createElement('div');
  body.style.cssText = 'padding: 12px;';

  if (corrections.pending_corrections.length === 0) {
    body.innerHTML =
      '<div style="text-align: center; color: #9aa3ae; padding: 20px 10px; font-size: 13px;">No pending corrections</div>';
  } else {
    for (let i = 0; i < corrections.pending_corrections.length; i++) {
      const correction = corrections.pending_corrections[i];
      const correctionCard = createCorrectionCard(correction, i);
      body.appendChild(correctionCard);
    }
  }

  sidebar.appendChild(body);
  document.body.appendChild(sidebar);
}

/**
 * Create a correction card
 */
function createCorrectionCard(correction: Correction, index: number): HTMLElement {
  const card = document.createElement('div');
  card.style.cssText = `
    background: #faf9fa;
    border: 1px solid #e8eaed;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
    font-size: 12px;
  `;

  const fieldLabel = document.createElement('div');
  fieldLabel.style.cssText = 'font-weight: 600; color: #0f1e2e; margin-bottom: 6px;';
  fieldLabel.textContent = correction.field;

  const systemLabel = document.createElement('div');
  systemLabel.style.cssText = 'font-size: 11px; color: #9aa3ae; margin-bottom: 8px;';
  systemLabel.textContent = `System: ${correction.system}`;

  const values = document.createElement('div');
  values.style.cssText =
    'background: white; padding: 8px; border-radius: 4px; margin-bottom: 8px; border-left: 2px solid #d64545;';
  values.innerHTML = `
    <div style="color: #d64545; margin-bottom: 4px; font-weight: 500;">Incorrect:</div>
    <div style="margin-bottom: 8px; word-break: break-all; color: #5a6472;">${escapeHtml(correction.incorrect_value)}</div>
    <div style="color: #1a9e6d; margin-bottom: 4px; font-weight: 500;">Correct:</div>
    <div style="word-break: break-all; color: #5a6472;">${escapeHtml(correction.correct_value)}</div>
  `;

  const buttons = document.createElement('div');
  buttons.style.cssText = 'display: flex; gap: 6px;';

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.style.cssText = `
    flex: 1;
    padding: 6px;
    background: #185fa5;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    transition: background 0.2s;
  `;
  copyBtn.addEventListener('mouseenter', () => {
    copyBtn.style.background = '#134083';
  });
  copyBtn.addEventListener('mouseleave', () => {
    copyBtn.style.background = '#185fa5';
  });
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(correction.correct_value).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 2000);
    });
  });

  const markBtn = document.createElement('button');
  markBtn.textContent = 'Mark Done';
  markBtn.style.cssText = `
    flex: 1;
    padding: 6px;
    background: #1a9e6d;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    transition: background 0.2s;
  `;
  markBtn.addEventListener('mouseenter', () => {
    markBtn.style.background = '#157856';
  });
  markBtn.addEventListener('mouseleave', () => {
    markBtn.style.background = '#1a9e6d';
  });
  markBtn.addEventListener('click', () => {
    markCorrectionAsComplete(correction.workflow_id);
    markBtn.disabled = true;
    markBtn.style.opacity = '0.6';
    markBtn.textContent = 'Marked';
  });

  buttons.appendChild(copyBtn);
  buttons.appendChild(markBtn);

  card.appendChild(fieldLabel);
  card.appendChild(systemLabel);
  card.appendChild(values);
  card.appendChild(buttons);

  return card;
}

/**
 * Mark correction as complete (send to API)
 */
async function markCorrectionAsComplete(workflowId: string): Promise<void> {
  try {
    const config = await chrome.storage.sync.get(['apiBaseUrl', 'authToken']);
    if (!config.authToken) {
      console.warn('[KairoLogic] Not authenticated');
      return;
    }

    // Send completion notification to API
    // In a real implementation, this would call an endpoint to mark the workflow as completed
    console.log('[KairoLogic] Marked workflow as complete:', workflowId);

    // Store in local tracking
    chrome.storage.local.get(['completedWorkflows'], (result) => {
      const completed = result.completedWorkflows || [];
      if (!completed.includes(workflowId)) {
        completed.push(workflowId);
        chrome.storage.local.set({ completedWorkflows: completed });
      }
    });
  } catch (err) {
    console.error('[KairoLogic] Error marking correction as complete:', err);
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main initialization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize content script
 */
async function init(): Promise<void> {
  try {
    // Get stored config
    const config = await chrome.storage.sync.get(['authToken', 'apiBaseUrl']);

    if (!config.authToken) {
      console.log('[KairoLogic] Not authenticated, skipping sidebar injection');
      return;
    }

    // Detect NPI
    const npi = detectNPI();
    if (!npi) {
      console.log('[KairoLogic] Could not detect NPI on this page');
      return;
    }

    console.log('[KairoLogic] Detected NPI:', npi);

    // Fetch corrections
    const apiBaseUrl = config.apiBaseUrl || 'https://app.kairologic.com';
    const response = await fetch(
      `${apiBaseUrl}/api/extensions/corrections?npi=${encodeURIComponent(npi)}`,
      {
        headers: {
          Authorization: `Bearer ${config.authToken}`,
        },
      },
    );

    if (!response.ok) {
      console.error('[KairoLogic] API error:', response.statusText);
      return;
    }

    const corrections = (await response.json()) as CorrectionsResponse;
    console.log('[KairoLogic] Fetched corrections:', corrections);

    // Inject sidebar if there are corrections
    if (corrections.total_pending > 0) {
      injectSidebar(corrections);
    }
  } catch (err) {
    console.error('[KairoLogic] Initialization error:', err);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
