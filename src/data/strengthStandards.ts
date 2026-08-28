/** Generalized bodyweight-ratio strength standards (est-1RM ÷ bodyweight) for the
 * main barbell lifts. These are original, rounded, rule-of-thumb figures — NOT
 * copied from any proprietary standards table — meant only to give a rough sense
 * of where a lift sits. Each lift lists the entry ratio to Novice / Intermediate /
 * Advanced / Elite; below the first threshold is "Untrained". */

export const STRENGTH_LEVELS = ['Untrained', 'Novice', 'Intermediate', 'Advanced', 'Elite'] as const;
export type StrengthLevel = (typeof STRENGTH_LEVELS)[number];

interface LiftStandard {
  /** 4 ascending thresholds → entry ratios to Novice, Intermediate, Advanced, Elite. */
  male: [number, number, number, number];
  female: [number, number, number, number];
}

/** Keyed by the exact seeded exercise name. */
export const STRENGTH_STANDARDS: Record<string, LiftStandard> = {
  'Barbell Bench Press': { male: [0.75, 1.0, 1.5, 2.0], female: [0.4, 0.6, 0.9, 1.2] },
  'Back Squat': { male: [1.0, 1.5, 2.0, 2.5], female: [0.6, 1.0, 1.4, 1.8] },
  'Deadlift': { male: [1.25, 1.75, 2.25, 2.75], female: [0.75, 1.2, 1.6, 2.0] },
  'Overhead Press': { male: [0.5, 0.7, 0.9, 1.2], female: [0.3, 0.45, 0.6, 0.8] },
  'Barbell Row': { male: [0.6, 0.85, 1.15, 1.5], female: [0.4, 0.6, 0.85, 1.1] },
};

export interface StrengthAssessment {
  levelIndex: number;        // 0..4
  level: StrengthLevel;
  ratio: number;             // est-1RM ÷ bodyweight
  thresholds: [number, number, number, number];
  /** Ratio needed to reach the next level, or null if already Elite. */
  nextRatio: number | null;
}

/** Where a lift sits given the user's est-1RM and bodyweight. Returns null when we
 * have no standard for that lift or no bodyweight to compare against. */
export function assessStrength(
  exerciseName: string,
  oneRepMax: number,
  bodyweight: number,
  sex?: string | null,
): StrengthAssessment | null {
  const std = STRENGTH_STANDARDS[exerciseName];
  if (!std || !bodyweight || bodyweight <= 0 || oneRepMax <= 0) return null;
  const thresholds = (sex || '').toLowerCase().startsWith('f') ? std.female : std.male;
  const ratio = oneRepMax / bodyweight;
  let levelIndex = 0;
  for (let i = 0; i < thresholds.length; i++) if (ratio >= thresholds[i]) levelIndex = i + 1;
  const nextRatio = levelIndex < thresholds.length ? thresholds[levelIndex] : null;
  return { levelIndex, level: STRENGTH_LEVELS[levelIndex], ratio, thresholds, nextRatio };
}
