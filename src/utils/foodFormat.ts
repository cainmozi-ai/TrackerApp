import type { Food } from '@/types';

/** The design's compact macro line, e.g. "40P 10C 3F 10S" (protein, carbs,
 * fat, sugar in grams), scaled to the number of servings. */
export function macroLine(food: Pick<Food, 'protein' | 'carbs' | 'fat' | 'sugar'>, servings = 1): string {
  const g = (n: number | null | undefined) => Math.round((n || 0) * servings);
  return `${g(food.protein)}P ${g(food.carbs)}C ${g(food.fat)}F ${g(food.sugar)}S`;
}

/** "1 serving" / "2 servings" / "1.5 servings". */
export function servingsLabel(servings: number): string {
  return `${servings} serving${servings === 1 ? '' : 's'}`;
}

/** "Fiber 9g · Sugar 11g · Sodium 120mg" for a portion, leaving out values
 * the food doesn't report. Empty when it reports none of them. */
export function extrasLine(food: Pick<Food, 'fiber' | 'sugar' | 'sodium'>, servings = 1): string {
  const r1 = (n: number) => Math.round(n * servings * 10) / 10;
  return [
    food.fiber != null ? `Fiber ${r1(food.fiber)}g` : '',
    food.sugar != null ? `Sugar ${r1(food.sugar)}g` : '',
    food.sodium != null ? `Sodium ${Math.round(food.sodium * servings)}mg` : '',
  ].filter(Boolean).join(' · ');
}
