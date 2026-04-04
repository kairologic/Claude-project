'use strict';
(() => {
  const loginView = document.getElementById('login-view');
  const authenticatedView = document.getElementById('authenticated-view');
  const statusMessage = document.getElementById('status-message');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const apiBaseUrlInput = document.getElementById('api-base-url');
  const loginBtn = document.getElementById('login-btn');
  const loginBtnText = document.getElementById('login-btn-text');
  const logoutBtn = document.getElementById('logout-btn');
  const authEmailSpan = document.getElementById('auth-email');
  const currentNpiSpan = document.getElementById('current-npi');
  const lastUpdatedSpan = document.getElementById('last-updated');
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    setTimeout(() => {
      statusMessage.className = 'status';
    }, 5e3);
  }
  function showError(message) {
    showStatus(message, 'error');
  }
  function showSuccess(message) {
    showStatus(message, 'success');
  }
  function showInfo(message) {
    showStatus(message, 'info');
  }
  function showLoginView() {
    loginView.classList.remove('hide');
    loginView.classList.add('show');
    authenticatedView.classList.remove('show');
    authenticatedView.classList.add('hide');
  }
  function showAuthenticatedView() {
    loginView.classList.add('hide');
    loginView.classList.remove('show');
    authenticatedView.classList.add('show');
    authenticatedView.classList.remove('hide');
  }
  async function authenticateUser(email, password, apiBaseUrl) {
    try {
      loginBtn.disabled = true;
      loginBtnText.textContent = 'Signing in...';
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.style.marginRight = '8px';
      loginBtn.insertBefore(spinner, loginBtnText);
      const response = await fetch(`${apiBaseUrl}/api/auth/callback?code=extension_login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      if (!response.ok) {
        throw new Error('Authentication failed. Check email and password.');
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'Authentication failed');
      }
      if (!data.session?.access_token) {
        throw new Error('No access token received');
      }
      await chrome.storage.sync.set({
        authToken: data.session.access_token,
        apiBaseUrl,
        userEmail: data.session.user.email,
        authenticated: true,
        authenticatedAt: /* @__PURE__ */ new Date().toISOString(),
      });
      showSuccess('Signed in successfully!');
      await updateUIState();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      showError(message);
      loginBtn.disabled = false;
      loginBtnText.textContent = 'Sign In';
      const spinner = loginBtn.querySelector('.spinner');
      if (spinner) spinner.remove();
      return false;
    }
  }
  async function logoutUser() {
    try {
      await chrome.storage.sync.remove([
        'authToken',
        'userEmail',
        'authenticated',
        'authenticatedAt',
      ]);
      showInfo('Signed out');
      await updateUIState();
    } catch (error) {
      showError('Failed to sign out');
      console.error('Logout error:', error);
    }
  }
  async function updateUIState() {
    const config = await chrome.storage.sync.get(['authenticated', 'userEmail']);
    if (config.authenticated && config.userEmail) {
      showAuthenticatedView();
      authEmailSpan.textContent = config.userEmail;
      updateCurrentNPI();
      updateLastUpdated();
    } else {
      showLoginView();
      emailInput.focus();
    }
  }
  async function updateCurrentNPI() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        currentNpiSpan.textContent = 'No active tab';
        return;
      }
      const response = await chrome.tabs
        .sendMessage(tabs[0].id, { action: 'getDetectedNPI' })
        .catch(() => null);
      if (response?.npi) {
        currentNpiSpan.textContent = response.npi;
      } else {
        currentNpiSpan.textContent = 'NPI not detected on this page';
      }
    } catch (error) {
      currentNpiSpan.textContent = 'Unable to detect NPI';
    }
  }
  function updateLastUpdated() {
    const now = /* @__PURE__ */ new Date();
    lastUpdatedSpan.textContent = now.toLocaleTimeString();
  }
  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const apiBaseUrl = apiBaseUrlInput.value.trim();
    if (!email || !password) {
      showError('Please enter email and password');
      return;
    }
    if (!apiBaseUrl) {
      showError('Please enter API base URL');
      return;
    }
    await authenticateUser(email, password, apiBaseUrl);
  });
  logoutBtn.addEventListener('click', async () => {
    await logoutUser();
  });
  emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') passwordInput.focus();
  });
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });
  chrome.tabs.onActivated.addListener(() => {
    const config = chrome.storage.sync.get('authenticated', (result) => {
      if (result.authenticated) {
        updateCurrentNPI();
      }
    });
  });
  window.addEventListener('DOMContentLoaded', async () => {
    const config = await chrome.storage.sync.get(['apiBaseUrl', 'userEmail']);
    if (config.apiBaseUrl) {
      apiBaseUrlInput.value = config.apiBaseUrl;
    }
    await updateUIState();
    setInterval(updateCurrentNPI, 2e3);
  });
})();
