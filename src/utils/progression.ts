/** Progressive-overload helpers: the smallest sensible weight jump for an
 * exercise, derived from its equipment when the user hasn't set one. */

/** Default weight increment (kg) for a piece of equipment — the smallest jump
 * you can realistically make in a gym. Barbells add a plate per side (2.5),
 * dumbbells come in ~2 kg steps, machine/cable stacks in bigger ~5 kg steps. */
export function defaultIncrement(equipment?: string | null): number {
  const e = (equipment || '').toLowerCase();
  if (e.includes('dumbbell')) return 2;
  if (e.includes('machine') || e.includes('cable') || e.includes('smith') || e.includes('leverage')) return 5;
  if (e.includes('barbell') || e.includes('ez') || e.includes('trap')) return 2.5;
  if (e.includes('kettlebell')) return 4;
  if (e.includes('bodyweight') || e.includes('band') || !e) return 1;
  return 2.5;
}

/** The effective increment for an exercise: its explicit override, else the
 * equipment default. */
export function effectiveIncrement(weightIncrement: number | null | undefined, equipment?: string | null): number {
  return weightIncrement != null && weightIncrement > 0 ? weightIncrement : defaultIncrement(equipment);
}
