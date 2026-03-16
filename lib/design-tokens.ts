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
  nppes_update: { label: 'NPPES UPDATE', tooltip: 'The National Plan and Provider Enumeration System, the federal registry for all healthcare providers' },
  payer_directory: { label: 'PAYER DIRECTORY', tooltip: 'Insurance company provider directories queried via FHIR PDex Plan-Net APIs' },
  onboarding: { label: 'ONBOARDING', tooltip: 'New provider credentialing workflow' },
  release: { label: 'RELEASE', tooltip: 'Provider departure workflow' },
  license_renewal: { label: 'LICENSE RENEWAL', tooltip: 'State medical board license status monitoring' },
  compliance: { label: 'COMPLIANCE', tooltip: 'State regulatory compliance: SB 1188, HB 149, AB 3030' },
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
