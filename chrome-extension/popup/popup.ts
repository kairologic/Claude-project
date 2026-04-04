/**
 * chrome-extension/popup/popup.ts
 *
 * Popup UI for KairoLogic Corrections Assistant.
 * Handles authentication and displays connection status.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

interface AuthResponse {
  session?: {
    access_token: string;
    user: {
      id: string;
      email: string;
    };
  };
  error?: {
    message: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────────────────────────────────────

const loginView = document.getElementById('login-view')!;
const authenticatedView = document.getElementById('authenticated-view')!;
const statusMessage = document.getElementById('status-message')!;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const apiBaseUrlInput = document.getElementById('api-base-url') as HTMLInputElement;
const loginBtn = document.getElementById('login-btn')!;
const loginBtnText = document.getElementById('login-btn-text')!;
const logoutBtn = document.getElementById('logout-btn')!;
const authEmailSpan = document.getElementById('auth-email')!;
const currentNpiSpan = document.getElementById('current-npi')!;
const lastUpdatedSpan = document.getElementById('last-updated')!;

// ─────────────────────────────────────────────────────────────────────────────
// Status message helpers
// ─────────────────────────────────────────────────────────────────────────────

function showStatus(message: string, type: 'success' | 'error' | 'info'): void {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  setTimeout(() => {
    statusMessage.className = 'status';
  }, 5000);
}

function showError(message: string): void {
  showStatus(message, 'error');
}

function showSuccess(message: string): void {
  showStatus(message, 'success');
}

function showInfo(message: string): void {
  showStatus(message, 'info');
}

// ─────────────────────────────────────────────────────────────────────────────
// UI State Management
// ─────────────────────────────────────────────────────────────────────────────

function showLoginView(): void {
  loginView.classList.remove('hide');
  loginView.classList.add('show');
  authenticatedView.classList.remove('show');
  authenticatedView.classList.add('hide');
}

function showAuthenticatedView(): void {
  loginView.classList.add('hide');
  loginView.classList.remove('show');
  authenticatedView.classList.add('show');
  authenticatedView.classList.remove('hide');
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticate user with KairoLogic API
 */
async function authenticateUser(
  email: string,
  password: string,
  apiBaseUrl: string,
): Promise<boolean> {
  try {
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Signing in...';
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    spinner.style.marginRight = '8px';
    loginBtn.insertBefore(spinner, loginBtnText);

    // Call authentication endpoint
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

    const data = (await response.json()) as AuthResponse;

    if (data.error) {
      throw new Error(data.error.message || 'Authentication failed');
    }

    if (!data.session?.access_token) {
      throw new Error('No access token received');
    }

    // Store auth token and config
    await chrome.storage.sync.set({
      authToken: data.session.access_token,
      apiBaseUrl,
      userEmail: data.session.user.email,
      authenticated: true,
      authenticatedAt: new Date().toISOString(),
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

/**
 * Logout user
 */
async function logoutUser(): Promise<void> {
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

// ─────────────────────────────────────────────────────────────────────────────
// UI Updates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update UI based on authentication state
 */
async function updateUIState(): Promise<void> {
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

/**
 * Update current NPI display
 */
async function updateCurrentNPI(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      currentNpiSpan.textContent = 'No active tab';
      return;
    }

    // Send message to content script to detect NPI
    const response = await chrome.tabs
      .sendMessage(tabs[0].id!, { action: 'getDetectedNPI' })
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

/**
 * Update last updated timestamp
 */
function updateLastUpdated(): void {
  const now = new Date();
  lastUpdatedSpan.textContent = now.toLocaleTimeString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────────────────────────────────

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

// Handle Enter key in inputs
emailInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') passwordInput.focus();
});

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

// Update NPI when switching tabs
chrome.tabs.onActivated.addListener(() => {
  const config = chrome.storage.sync.get('authenticated', (result) => {
    if (result.authenticated) {
      updateCurrentNPI();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  // Load stored config
  const config = await chrome.storage.sync.get(['apiBaseUrl', 'userEmail']);

  if (config.apiBaseUrl) {
    apiBaseUrlInput.value = config.apiBaseUrl;
  }

  // Update UI state
  await updateUIState();

  // Refresh NPI display every 2 seconds (active tab might have changed)
  setInterval(updateCurrentNPI, 2000);
});
