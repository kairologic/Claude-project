/**
 * chrome-extension/background/service-worker.ts
 *
 * Background service worker for KairoLogic Corrections Assistant.
 * Manages auth token refresh and updates badge counter.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
const BADGE_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Token management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Refresh authentication token
 */
async function refreshAuthToken(): Promise<void> {
  try {
    const config = await chrome.storage.sync.get(['authToken', 'apiBaseUrl']);

    if (!config.authToken || !config.apiBaseUrl) {
      console.log('[KairoLogic-BG] Not authenticated, skipping token refresh');
      return;
    }

    // Verify token is still valid by making a simple API call
    const response = await fetch(`${config.apiBaseUrl}/api/extensions/corrections?npi=0000000000`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.authToken}`,
      },
    });

    if (response.status === 401) {
      // Token is invalid, clear auth
      console.log('[KairoLogic-BG] Token invalid, clearing auth');
      await chrome.storage.sync.remove(['authToken', 'authenticated']);
      return;
    }

    console.log('[KairoLogic-BG] Token refreshed successfully');
  } catch (error) {
    console.error('[KairoLogic-BG] Token refresh error:', error);
  }
}

/**
 * Schedule periodic token refresh
 */
function scheduleTokenRefresh(): void {
  setInterval(async () => {
    await refreshAuthToken();
  }, TOKEN_REFRESH_INTERVAL);

  // Do initial refresh after 5 minutes
  setTimeout(
    async () => {
      await refreshAuthToken();
    },
    5 * 60 * 1000,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update badge counter with pending corrections
 */
async function updateBadgeCounter(): Promise<void> {
  try {
    const config = await chrome.storage.sync.get(['authToken', 'apiBaseUrl']);

    if (!config.authToken) {
      // Not authenticated, clear badge
      await chrome.action.setBadgeText({ text: '' });
      return;
    }

    // Get active tab to detect NPI
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs[0]) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }

    // Try to get NPI from content script
    let npi: string | null = null;

    try {
      const response = await chrome.tabs
        .sendMessage(tabs[0].id!, { action: 'getDetectedNPI' })
        .catch(() => null);
      if (response?.npi) {
        npi = response.npi;
      }
    } catch {
      // Content script not available
      return;
    }

    if (!npi) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }

    // Fetch corrections for this NPI
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
      return;
    }

    const data = await response.json();
    const count = data.total_pending || 0;

    // Update badge
    if (count > 0) {
      await chrome.action.setBadgeText({ text: String(Math.min(count, 99)) });
      await chrome.action.setBadgeBackgroundColor({ color: '#D64545' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }

    // Store count in storage for quick access
    await chrome.storage.local.set({
      lastBadgeCount: count,
      lastBadgeUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[KairoLogic-BG] Badge update error:', error);
  }
}

/**
 * Schedule periodic badge updates
 */
function scheduleBadgeUpdates(): void {
  // Update immediately
  updateBadgeCounter();

  // Then update at interval
  setInterval(async () => {
    await updateBadgeCounter();
  }, BADGE_UPDATE_INTERVAL);
}

// ─────────────────────────────────────────────────────────────────────────────
// Event listeners
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Listen for tab changes to update badge
 */
chrome.tabs.onActivated.addListener(() => {
  updateBadgeCounter();
});

/**
 * Listen for URL changes to update badge
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    updateBadgeCounter();
  }
});

/**
 * Listen for storage changes
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.authenticated) {
    if (changes.authenticated.newValue === false) {
      // User logged out, clear badge
      chrome.action.setBadgeText({ text: '' });
    } else {
      // User logged in, update badge
      updateBadgeCounter();
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Message handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'getAuthStatus': {
          const config = await chrome.storage.sync.get(['authenticated', 'userEmail']);
          sendResponse({
            authenticated: config.authenticated || false,
            email: config.userEmail || null,
          });
          break;
        }

        case 'refreshBadge': {
          await updateBadgeCounter();
          sendResponse({ success: true });
          break;
        }

        case 'logout': {
          await chrome.storage.sync.remove(['authToken', 'authenticated', 'userEmail']);
          await chrome.action.setBadgeText({ text: '' });
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[KairoLogic-BG] Message handler error:', error);
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  })();

  // Return true to indicate we'll send a response asynchronously
  return true;
});

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

// Schedule periodic tasks
scheduleTokenRefresh();
scheduleBadgeUpdates();

console.log('[KairoLogic-BG] Service worker initialized');
