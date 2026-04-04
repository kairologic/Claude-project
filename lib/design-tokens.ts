/**
 * lib/design-tokens.ts
 *
 * KairoLogic dashboard design system tokens.
 * Import in components for type-safe color/spacing references.
 */

export const colors = {
  navy: '#0F1E2E',
  navyMid: '#1A3249',
  navyLight: '#8BA3B8',
  gold: '#D4A017',
  goldLight: '#F0C040',
  goldPale: '#FDF6E3',
  gray50: '#FAFAFA',
  gray100: '#F4F5F7',
  gray200: '#E8EAED',
  gray300: '#D1D8E0',
  gray400: '#9AA3AE',
  gray600: '#5A6472',
  green: '#1A9E6D',
  greenPale: '#E6F7F2',
  red: '#D64545',
  redPale: '#FDEEEE',
  blue: '#185FA5',
  bluePale: '#EEF4FF',
  white: '#FFFFFF',
} as const;

export const statusColors = {
  action_needed: colors.red,
  in_progress: colors.gold,
  awaiting: colors.blue,
  resolved: colors.green,
  cancelled: colors.gray400,
} as const;

export const statusBgColors = {
  action_needed: colors.redPale,
  in_progress: colors.goldPale,
  awaiting: colors.bluePale,
  resolved: colors.greenPale,
  cancelled: colors.gray100,
} as const;

export const statusLabels = {
  action_needed: 'Needs action',
  in_progress: 'In progress',
  awaiting: 'Awaiting',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
} as const;

export const workflowTypeLabels: Record<string, { label: string; tooltip: string }> = {
  nppes_update: {
    label: 'NPPES UPDATE',
    tooltip:
      'The National Plan and Provider Enumeration System, the federal registry for all healthcare providers',
  },
  payer_directory: {
    label: 'PAYER DIRECTORY',
    tooltip: 'Insurance company provider directories queried via FHIR PDex Plan-Net APIs',
  },
  onboarding: { label: 'ONBOARDING', tooltip: 'New provider credentialing workflow' },
  release: { label: 'RELEASE', tooltip: 'Provider departure workflow' },
  license_renewal: {
    label: 'LICENSE RENEWAL',
    tooltip: 'State medical board license status monitoring',
  },
  compliance: {
    label: 'COMPLIANCE',
    tooltip: 'State regulatory compliance: SB 1188, HB 149, AB 3030',
  },
  credentialing_onboarding: {
    label: 'CREDENTIALING',
    tooltip:
      'New provider onboarding — multi-source assessment, CAQH enrollment, payer credentialing, PECOS, and automated monitoring',
  },
  credentialing_departure: {
    label: 'DEPARTURE',
    tooltip:
      'Provider departure — remove from directories, CAQH, PECOS, and 90-day phantom listing monitoring',
  },
};

/** Task group labels for credentialing workflows */
export const credentialingGroupLabels: Record<
  string,
  { label: string; icon: string; description: string }
> = {
  immediate: {
    label: 'Immediate',
    icon: '⚡',
    description: 'Tasks the practice manager can do right now',
  },
  submit_wait: {
    label: 'Submit & Wait',
    icon: '📤',
    description: 'Submit forms and wait for processing',
  },
  monitoring: {
    label: 'Automated Monitoring',
    icon: '📡',
    description: 'System watches — no action needed',
  },
  complete: { label: 'Already Complete', icon: '✅', description: 'No action needed' },
};

/** Payer portal URLs for credentialing task routing */
export const payerPortals: Record<
  string,
  { name: string; url: string; pullsFromCaqh: boolean; method: string }
> = {
  nppes: {
    name: 'NPPES',
    url: 'https://nppes.cms.hhs.gov/',
    pullsFromCaqh: false,
    method: 'Direct portal submission',
  },
  caqh: {
    name: 'CAQH ProView',
    url: 'https://proview.caqh.org/',
    pullsFromCaqh: false,
    method: 'CAQH profile update',
  },
  uhc: {
    name: 'UnitedHealthcare',
    url: 'https://proview.caqh.org/',
    pullsFromCaqh: true,
    method: 'CAQH auto-propagation',
  },
  aetna: {
    name: 'Aetna',
    url: 'https://proview.caqh.org/',
    pullsFromCaqh: true,
    method: 'CAQH auto-propagation',
  },
  cigna: {
    name: 'Cigna',
    url: 'https://cignaforhcp.cigna.com/',
    pullsFromCaqh: false,
    method: 'Direct credentialing application',
  },
  humana: {
    name: 'Humana',
    url: 'https://www.humana.com/provider/',
    pullsFromCaqh: false,
    method: 'Direct credentialing application',
  },
  bcbstx: {
    name: 'BCBS TX',
    url: 'https://essentials.availity.com/',
    pullsFromCaqh: false,
    method: 'Availity PDM',
  },
  blueshieldca: {
    name: 'Blue Shield CA',
    url: 'https://www.blueshieldca.com/en/provider',
    pullsFromCaqh: false,
    method: 'Provider Connection portal',
  },
  pecos: {
    name: 'PECOS (Medicare)',
    url: 'https://pecos.cms.hhs.gov/',
    pullsFromCaqh: false,
    method: 'CMS portal',
  },
  tmb: {
    name: 'TX Medical Board',
    url: 'https://profile.tmb.state.tx.us/',
    pullsFromCaqh: false,
    method: 'TMB portal',
  },
};

export const rosterStatusMap: Record<string, { badge: string; color: string; bg: string }> = {
  active: { badge: 'Active', color: colors.green, bg: colors.greenPale },
  onboarding: { badge: 'Onboarding', color: colors.blue, bg: colors.bluePale },
  departing: { badge: 'Departing', color: colors.red, bg: colors.redPale },
  departed: { badge: 'Departed', color: colors.gray400, bg: colors.gray100 },
};

export const avatarColors: Record<string, string> = {
  active: colors.navy,
  onboarding: colors.blue,
  departing: colors.gray400,
  departed: colors.gray400,
};

export const alertSeverityColors: Record<string, string> = {
  action: colors.red,
  warning: colors.gold,
  info: colors.blue,
  resolved: colors.green,
};

export const alertSeverityLabels: Record<string, string> = {
  action: 'Action',
  warning: 'Warning',
  info: 'Info',
  resolved: 'Resolved',
};

// ─── Typography Scale ────────────────────────────────────────────────────────

export const typography = {
  /** Page titles — 28px / 800 */
  h1: { fontSize: 28, fontWeight: 800 as const, lineHeight: 1.2 },
  /** Section headings — 20px / 700 */
  h2: { fontSize: 20, fontWeight: 700 as const, lineHeight: 1.25 },
  /** Card headings — 15px / 700 */
  h3: { fontSize: 15, fontWeight: 700 as const, lineHeight: 1.35 },
  /** Sub-headings — 13px / 600 */
  h4: { fontSize: 13, fontWeight: 600 as const, lineHeight: 1.4 },
  /** Body text */
  body: { fontSize: 13, fontWeight: 500 as const, lineHeight: 1.55 },
  /** Secondary / description text */
  bodySmall: { fontSize: 12, fontWeight: 400 as const, lineHeight: 1.5 },
  /** Captions, metadata, timestamps */
  caption: { fontSize: 11, fontWeight: 500 as const, lineHeight: 1.4 },
  /** Uppercase labels */
  label: {
    fontSize: 10,
    fontWeight: 700 as const,
    lineHeight: 1.4,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  /** Monospace for NPI, IDs, codes */
  mono: {
    fontSize: 12,
    fontWeight: 500 as const,
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  },
} as const;

// ─── Spacing Scale ───────────────────────────────────────────────────────────

export const spacing = {
  /** 2px — hairline gaps */
  xxs: 2,
  /** 4px — tight element gaps */
  xs: 4,
  /** 8px — compact padding */
  sm: 8,
  /** 12px — standard gap */
  md: 12,
  /** 16px — section padding */
  lg: 16,
  /** 20px — page gutter */
  xl: 20,
  /** 24px — card padding */
  '2xl': 24,
  /** 32px — section separation */
  '3xl': 32,
  /** 40px — page padding */
  '4xl': 40,
} as const;

// ─── Shadow Scale (Elevation) ────────────────────────────────────────────────

export const shadows = {
  /** Subtle border replacement */
  xs: '0 1px 2px rgba(11,30,46,0.04)',
  /** Cards at rest */
  sm: '0 1px 3px rgba(11,30,46,0.06), 0 1px 2px rgba(11,30,46,0.04)',
  /** Cards on hover */
  md: '0 4px 12px rgba(11,30,46,0.08), 0 1px 3px rgba(11,30,46,0.05)',
  /** Floating panels, dropdowns */
  lg: '0 8px 24px rgba(11,30,46,0.10), 0 2px 6px rgba(11,30,46,0.05)',
  /** Modals, overlays */
  xl: '0 16px 48px rgba(11,30,46,0.14), 0 4px 12px rgba(11,30,46,0.06)',
} as const;

// ─── Transition Tokens ───────────────────────────────────────────────────────

export const transitions = {
  /** Hover states, button presses — snappy */
  fast: '120ms cubic-bezier(0.4, 0, 0.2, 1)',
  /** Standard interactions — smooth */
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  /** Panel slides, route transitions — deliberate */
  slow: '320ms cubic-bezier(0.4, 0, 0.2, 1)',
  /** Emphasized entrances (modals, toasts) */
  spring: '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const radii = {
  /** Subtle rounding — inputs, small elements */
  sm: 4,
  /** Standard — cards, buttons */
  md: 8,
  /** Prominent — panels, modals */
  lg: 12,
  /** Large containers */
  xl: 16,
  /** Pills, tags, badges */
  full: 9999,
} as const;

// ─── Focus Ring ──────────────────────────────────────────────────────────────

export const focusRing = {
  outline: `2px solid ${colors.blue}`,
  outlineOffset: '2px',
} as const;

// ─── CSS Keyframe strings (for injection into style tags) ────────────────────

export const keyframes = {
  fadeIn: `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`,
  fadeInUp: `@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`,
  fadeInDown: `@keyframes fadeInDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`,
  slideInRight: `@keyframes slideInRight { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }`,
  slideInLeft: `@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`,
  scaleIn: `@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`,
  pulse: `@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`,
  shimmer: `@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`,
  countUp: `@keyframes countUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`,
  spin: `@keyframes spin { to { transform: rotate(360deg); } }`,
} as const;
