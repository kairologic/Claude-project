/**
 * lib/outreach/index.ts — Barrel export for outreach utilities.
 */

export {
  scorePractice,
  rankPractices,
  toCSVRows,
} from './scoring-engine';

export type {
  PracticeSignals,
  OutreachScore,
} from './scoring-engine';
