import type { DashboardConfig } from '@/types';

/** Every dashboard section that can be shown/reordered. */
export const DASHBOARD_SECTIONS: { key: string; label: string }[] = [
  { key: 'weekly', label: 'Weekly Workouts' },
  { key: 'today', label: 'Today (life tiles)' },
  { key: 'insights', label: 'Insights & Analytics' },
  { key: 'habits', label: 'Habits' },
  { key: 'bodyMetrics', label: 'Body Metrics' },
  { key: 'muscleGroups', label: 'Muscle Groups' },
  { key: 'exercises', label: 'Exercises' },
  { key: 'steps', label: 'Steps' },
];

export const SECTION_LABEL: Record<string, string> = Object.fromEntries(
  DASHBOARD_SECTIONS.map(s => [s.key, s.label])
);

/** Default layout, mirroring the reference app's dashboard. */
export const DEFAULT_DASHBOARD: DashboardConfig = {
  sections: ['weekly', 'today', 'insights', 'habits', 'bodyMetrics', 'muscleGroups', 'exercises', 'steps'],
  muscleGroups: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'],
  exercises: [],
  exerciseMetric: '1rm',
  weeklyMode: 'all',
  targets: { muscles: 12, sets: 60, exercises: 20 },
};

/** Parse a stored dashboard_config JSON blob, filling any missing fields from defaults. */
export function parseDashboardConfig(raw: string | null | undefined): DashboardConfig {
  if (!raw) return { ...DEFAULT_DASHBOARD };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        sections: Array.isArray(parsed.sections) && parsed.sections.length ? parsed.sections : DEFAULT_DASHBOARD.sections,
        muscleGroups: Array.isArray(parsed.muscleGroups) ? parsed.muscleGroups : DEFAULT_DASHBOARD.muscleGroups,
        exercises: Array.isArray(parsed.exercises) ? parsed.exercises : [],
        exerciseMetric: parsed.exerciseMetric || DEFAULT_DASHBOARD.exerciseMetric,
        weeklyMode: parsed.weeklyMode || DEFAULT_DASHBOARD.weeklyMode,
        targets: parsed.targets && typeof parsed.targets === 'object' ? { ...DEFAULT_DASHBOARD.targets, ...parsed.targets } : { ...DEFAULT_DASHBOARD.targets },
      };
    }
  } catch {
    // Malformed — fall back to defaults.
  }
  return { ...DEFAULT_DASHBOARD };
}
