# KairoLogic Corrections Assistant - Chrome Extension

A Chrome extension that provides in-context correction guidance for healthcare provider data across NPPES, PECOS, CAQH, and payer portals.

## Features

- **Real-time NPI Detection**: Automatically detects NPI from supported healthcare portals
- **Pending Corrections Sidebar**: Shows pending corrections directly on provider portals
- **Copy-to-Clipboard**: One-click copying of corrected values
- **Auto-verification Tracking**: Mark corrections as completed
- **Secure Authentication**: Browser-based login with JWT token storage

## Supported Portals

- NPPES (nppes.cms.hhs.gov)
- PECOS (pecos.cms.hhs.gov)
- CAQH ProView (caqh.org, proview.caqh.org)
- UnitedHealthcare (portal.uhc.com, myuhc.com)
- Aetna (aetna.com, provider.aetna.com)
- Availity (availity.com, essentials.availity.com)
- Cigna (cignaforhcp.cigna.com)
- Humana (humana.com)
- Blue Shield CA (blueshieldca.com)

## File Structure

```
chrome-extension/
├── manifest.json              # Extension manifest (v3)
├── popup/
│   ├── popup.html            # Popup UI
│   └── popup.ts              # Popup TypeScript (compiled to popup.js)
├── content/
│   └── content.ts            # Content script (compiled to content.js)
├── background/
│   └── service-worker.ts     # Service worker (compiled to service-worker.js)
├── images/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

## Build Instructions

### Prerequisites

- Node.js 16+ with npm
- TypeScript installed globally or locally

### Build Steps

1. **Compile TypeScript files:**

```bash
# From project root
npx tsc chrome-extension/popup/popup.ts --target ES2020 --module ES2020 --outDir chrome-extension/popup
npx tsc chrome-extension/content/content.ts --target ES2020 --module ES2020 --outDir chrome-extension/content
npx tsc chrome-extension/background/service-worker.ts --target ES2020 --module ES2020 --outDir chrome-extension/background
```

2. **Create placeholder icons** (if not present):

```bash
# Create simple colored PNG icons (16x16, 48x48, 128x128)
# Or use existing brand assets in your project
```

3. **Verify the extension structure:**

```
chrome-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   └── popup.js (compiled)
├── content/
│   └── content.js (compiled)
├── background/
│   └── service-worker.js (compiled)
└── images/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Installation

### Development Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `chrome-extension` directory from this project
5. The extension should appear in your Chrome toolbar

### Usage

1. Click the KairoLogic extension icon in your toolbar
2. Sign in with your KairoLogic credentials
3. Configure the API base URL (default: https://app.kairologic.com)
4. Navigate to any supported provider portal
5. The extension will automatically:
   - Detect the NPI
   - Fetch pending corrections
   - Display a sidebar with correction guidance

## API Integration

The extension communicates with the KairoLogic API at `/api/extensions/corrections` endpoint.

### Authentication

All requests include a Bearer token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

### NPI Detection Logic

**NPPES:**

- Extracts from `?npi=` query parameter

**PECOS:**

- Searches for `input[name*="npi"]` field
- Regex pattern: `/NPI[:\s]+(\d{10})/i`

**CAQH:**

- Searches `[data-npi]` attribute
- Searches `[id*="npi"]` and `[class*="npi"]` selectors
- Regex pattern: `/(?:NPI|#)[:\s]*(\d{10})/i`

**Payer Portals:**

- Generic selectors: `input[name*="npi"]`, `[data-field="npi"]`
- Regex pattern: `/(?:NPI|Provider #)[:\s]*(\d{10})/i`

## Storage

The extension uses Chrome's storage API:

**chrome.storage.sync:**

- `authToken` - JWT access token
- `apiBaseUrl` - API endpoint base URL
- `userEmail` - Authenticated user email
- `authenticated` - Boolean auth status

**chrome.storage.local:**

- `completedWorkflows` - Array of marked-as-complete workflow IDs
- `lastBadgeCount` - Last known pending correction count
- `lastBadgeUpdate` - ISO timestamp of last badge update

## Permissions

- `activeTab` - Detect current page NPI
- `storage` - Store auth token and configuration
- `clipboardWrite` - Copy corrections to clipboard

## Security Considerations

1. **Token Storage**: Auth tokens are stored in `chrome.storage.sync` (encrypted by browser)
2. **Content Script Isolation**: Content scripts run in isolated world
3. **API Validation**: All API calls validate bearer token server-side
4. **HTTPS Only**: Extension only connects to HTTPS endpoints
5. **No Data Persistence**: Completed correction records stored locally only

## Troubleshooting

### Extension not detecting NPI

- Verify you're on a supported portal domain
- Check browser console for error messages
- Ensure content script is injected (check Extensions > KairoLogic > Details > Content scripts)

### API authentication errors

- Clear stored credentials and re-authenticate
- Verify API base URL is correct
- Check that JWT token hasn't expired

### Sidebar not appearing

- Ensure you're authenticated (popup shows "Connected")
- Verify NPI was detected (popup shows NPI)
- Check that corrections exist for this NPI

### Badge counter not updating

- Refresh the page
- Click extension icon to trigger badge update
- Check background service worker logs (Extensions page > Details > Errors)

## Development

### TypeScript Compilation

Watch mode for development:

```bash
npx tsc --watch chrome-extension/
```

### Testing Content Script

To test NPI detection locally:

```javascript
// In browser console on a supported portal
chrome.runtime.sendMessage({ action: 'getDetectedNPI' }, (response) => console.log(response));
```

### Debugging Service Worker

1. Go to `chrome://extensions/`
2. Find KairoLogic extension
3. Click "Service worker" link under "Details"
4. Open DevTools to inspect

## Version History

- **1.0.0** (2026-03-31)
  - Initial release
  - Support for 9 major healthcare portals
  - Real-time NPI detection
  - Pending corrections sidebar
  - Badge counter for pending items
