export const colors = {
  navy: '#0F1E2E',
  navyMid: '#1A2F42',
  navyLight: '#8BA3B8',
  gold: '#D4A017',
  green: '#1A9E6D',
  red: '#D64545',
  blue: '#3B82F6',
  gray100: '#F7F8FA',
  gray200: '#E8ECF0',
  gray300: '#D1D8E0',
  gray400: '#9AA3AE',
  gray600: '#4B5563',
  white: '#FFFFFF',
};

/** Workflow status → color mapping used by GlobalSearch & dashboard widgets */
export const statusColors: Record<string, string> = {
  awaiting: colors.gold,
  in_progress: colors.blue,
  submitted: colors.blue,
  approved: colors.green,
  denied: colors.red,
  resolved: colors.green,
  escalated: colors.red,
};

/** Workflow status → human-readable label */
export const statusLabels: Record<string, string> = {
  awaiting: 'Awaiting',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  approved: 'Approved',
  denied: 'Denied',
  resolved: 'Resolved',
  escalated: 'Escalated',
};
