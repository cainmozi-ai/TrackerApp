import type { WorkoutSet } from '@/types';

/** How an exercise is measured. Drives the keypad fields and how sets display. */
export type LogType = 'weight_reps' | 'bodyweight' | 'duration' | 'cardio';

/** mm:ss for a second count (e.g. 90 → "1:30"). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Accumulated keypad digits → display "M:SS" (e.g. "130" → "1:30"). */
export function digitsToTime(digits: string): string {
  const d = (digits || '').replace(/\D/g, '').slice(-4) || '0';
  const padded = d.padStart(3, '0');
  const mm = padded.slice(0, -2);
  const ss = padded.slice(-2);
  return `${parseInt(mm, 10)}:${ss}`;
}

/** Accumulated keypad digits → total seconds. */
export function digitsToSeconds(digits: string): number {
  const d = (digits || '').replace(/\D/g, '').slice(-4) || '0';
  const padded = d.padStart(3, '0');
  const mm = parseInt(padded.slice(0, -2), 10);
  const ss = parseInt(padded.slice(-2), 10);
  return mm * 60 + ss;
}

/** True when the seconds part of accumulated digits is invalid (≥ 60). */
export function digitsSecondsOverflow(digits: string): boolean {
  const d = (digits || '').replace(/\D/g, '').slice(-4);
  if (d.length < 2) return false;
  return parseInt(d.slice(-2), 10) >= 60;
}

/** Total seconds → keypad digit string (90 → "130"). */
export function secondsToDigits(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s === 0) return '';
  return `${Math.floor(s / 60)}${String(s % 60).padStart(2, '0')}`;
}

/** One-line summary of a logged set, formatted for its exercise's log type. */
export function formatSet(
  set: Pick<WorkoutSet, 'weight' | 'reps' | 'durationSeconds' | 'distance'>,
  logType: LogType,
  unit = 'kg'
): string {
  switch (logType) {
    case 'duration':
      return formatDuration(set.durationSeconds);
    case 'cardio': {
      const parts: string[] = [];
      if (set.distance > 0) parts.push(`${set.distance} km`);
      if (set.durationSeconds > 0) parts.push(formatDuration(set.durationSeconds));
      return parts.join(' · ') || '—';
    }
    case 'bodyweight':
      return set.weight > 0 ? `${set.reps} reps +${set.weight}${unit}` : `${set.reps} reps`;
    default:
      return `${set.weight} ${unit} × ${set.reps}`;
  }
}

/** Compact form for dense "Last: …" lines. */
export function formatSetCompact(
  set: Pick<WorkoutSet, 'weight' | 'reps' | 'durationSeconds' | 'distance'>,
  logType: LogType
): string {
  switch (logType) {
    case 'duration':
      return formatDuration(set.durationSeconds);
    case 'cardio':
      return set.distance > 0 ? `${set.distance}km` : formatDuration(set.durationSeconds);
    case 'bodyweight':
      return set.weight > 0 ? `${set.reps}+${set.weight}` : `${set.reps}`;
    default:
      return `${set.weight}×${set.reps}`;
  }
}
