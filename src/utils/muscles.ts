/** Muscle taxonomy for the exercise library and dashboard muscle-set tracking.
 * Each muscle rolls up into one of the app's high-level groups (the same groups
 * used by the exercise library chips and Progress "set levels"). */

export type MuscleGroup =
  | 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Glutes' | 'Core' | 'Cardio';

export interface MuscleDef {
  key: string;            // canonical muscle name, e.g. "Lats"
  group: MuscleGroup;     // high-level group it belongs to
  region: 'upper' | 'lower' | 'core'; // for the Type filter (compound upper/lower)
}

export const MUSCLES: MuscleDef[] = [
  { key: 'Chest', group: 'Chest', region: 'upper' },
  { key: 'Upper Back', group: 'Back', region: 'upper' },
  { key: 'Lats', group: 'Back', region: 'upper' },
  { key: 'Lower Back', group: 'Back', region: 'core' },
  { key: 'Upper Traps', group: 'Back', region: 'upper' },
  { key: 'Front Delts', group: 'Shoulders', region: 'upper' },
  { key: 'Side Delts', group: 'Shoulders', region: 'upper' },
  { key: 'Rear Delts', group: 'Shoulders', region: 'upper' },
  { key: 'Biceps', group: 'Arms', region: 'upper' },
  { key: 'Triceps', group: 'Arms', region: 'upper' },
  { key: 'Forearms', group: 'Arms', region: 'upper' },
  { key: 'Quads', group: 'Legs', region: 'lower' },
  { key: 'Hamstrings', group: 'Legs', region: 'lower' },
  { key: 'Glutes', group: 'Glutes', region: 'lower' },
  { key: 'Calves', group: 'Legs', region: 'lower' },
  { key: 'Adductors', group: 'Legs', region: 'lower' },
  { key: 'Abductors', group: 'Legs', region: 'lower' },
  { key: 'Abs', group: 'Core', region: 'core' },
  { key: 'Obliques', group: 'Core', region: 'core' },
  { key: 'Serratus', group: 'Core', region: 'core' },
  { key: 'Neck', group: 'Shoulders', region: 'upper' },
];

export const MUSCLE_KEYS = MUSCLES.map(m => m.key);
export const MUSCLE_BY_KEY: Record<string, MuscleDef> = Object.fromEntries(MUSCLES.map(m => [m.key, m]));

/** High-level groups, in display order, for filter chips. */
export const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core', 'Cardio'];

/** Muscles belonging to a high-level group. */
export function musclesInGroup(group: MuscleGroup): string[] {
  return MUSCLES.filter(m => m.group === group).map(m => m.key);
}

/** The high-level group a muscle rolls up into (defaults to its own name). */
export function groupOf(muscle: string): MuscleGroup | null {
  return MUSCLE_BY_KEY[muscle]?.group ?? null;
}

export type ExerciseType = 'compound-upper' | 'compound-lower' | 'upper-isolation' | 'lower-isolation' | 'core';

export const EXERCISE_TYPES: { key: ExerciseType; label: string }[] = [
  { key: 'compound-upper', label: 'Compound Upper' },
  { key: 'compound-lower', label: 'Compound Lower' },
  { key: 'upper-isolation', label: 'Upper Isolation' },
  { key: 'lower-isolation', label: 'Lower Isolation' },
  { key: 'core', label: 'Core' },
];

/** Derive the library "Type" filter value from an exercise's mechanic + region. */
export function exerciseType(mechanic: string, region: string): ExerciseType {
  if (region === 'core') return 'core';
  const upper = region !== 'lower';
  if (mechanic === 'compound') return upper ? 'compound-upper' : 'compound-lower';
  return upper ? 'upper-isolation' : 'lower-isolation';
}

/** Format "Primary, list • Secondary, list" for an exercise row. */
export function formatMuscles(primary: string[], secondary: string[]): string {
  const p = primary.join(', ');
  const s = secondary.join(', ');
  return s ? `${p} • ${s}` : p;
}
