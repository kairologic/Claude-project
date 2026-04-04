'use strict';
(() => {
  const TOKEN_REFRESH_INTERVAL = 60 * 60 * 1e3;
  const BADGE_UPDATE_INTERVAL = 5 * 60 * 1e3;
  async function refreshAuthToken() {
    try {
      const config = await chrome.storage.sync.get(['authToken', 'apiBaseUrl']);
      if (!config.authToken || !config.apiBaseUrl) {
        console.log('[KairoLogic-BG] Not authenticated, skipping token refresh');
        return;
      }
      const response = await fetch(
        `${config.apiBaseUrl}/api/extensions/corrections?npi=0000000000`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.authToken}`,
          },
        },
      );
      if (response.status === 401) {
        console.log('[KairoLogic-BG] Token invalid, clearing auth');
        await chrome.storage.sync.remove(['authToken', 'authenticated']);
        return;
      }
      console.log('[KairoLogic-BG] Token refreshed successfully');
    } catch (error) {
      console.error('[KairoLogic-BG] Token refresh error:', error);
    }
  }
  function scheduleTokenRefresh() {
    setInterval(async () => {
      await refreshAuthToken();
    }, TOKEN_REFRESH_INTERVAL);
    setTimeout(
      async () => {
        await refreshAuthToken();
      },
      5 * 60 * 1e3,
    );
  }
  async function updateBadgeCounter() {
    try {
      const config = await chrome.storage.sync.get(['authToken', 'apiBaseUrl']);
      if (!config.authToken) {
        await chrome.action.setBadgeText({ text: '' });
        return;
      }
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        await chrome.action.setBadgeText({ text: '' });
        return;
      }
      let npi = null;
      try {
        const response2 = await chrome.tabs
          .sendMessage(tabs[0].id, { action: 'getDetectedNPI' })
          .catch(() => null);
        if (response2?.npi) {
          npi = response2.npi;
        }
      } catch {
        return;
      }
      if (!npi) {
        await chrome.action.setBadgeText({ text: '' });
        return;
      }
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
      if (count > 0) {
        await chrome.action.setBadgeText({ text: String(Math.min(count, 99)) });
        await chrome.action.setBadgeBackgroundColor({ color: '#D64545' });
      } else {
        await chrome.action.setBadgeText({ text: '' });
      }
      await chrome.storage.local.set({
        lastBadgeCount: count,
        lastBadgeUpdate: /* @__PURE__ */ new Date().toISOString(),
      });
    } catch (error) {
      console.error('[KairoLogic-BG] Badge update error:', error);
    }
  }
  function scheduleBadgeUpdates() {
    updateBadgeCounter();
    setInterval(async () => {
      await updateBadgeCounter();
    }, BADGE_UPDATE_INTERVAL);
  }
  chrome.tabs.onActivated.addListener(() => {
    updateBadgeCounter();
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
      updateBadgeCounter();
    }
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.authenticated) {
      if (changes.authenticated.newValue === false) {
        chrome.action.setBadgeText({ text: '' });
      } else {
        updateBadgeCounter();
      }
    }
  });
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
    return true;
  });
  scheduleTokenRefresh();
  scheduleBadgeUpdates();
  console.log('[KairoLogic-BG] Service worker initialized');
})();
