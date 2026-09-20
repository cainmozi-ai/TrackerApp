/** Micronutrient reference data. RDAs from the NIH Office of Dietary Supplements
 * fact sheets (adult defaults). Amounts are tracked in each nutrient's display
 * unit (mg or mcg). Not medical advice. */

export type MicroGroup = 'vitamin' | 'mineral';
export type CategoryKey = 'brain' | 'muscle' | 'skin' | 'sleep' | 'energy' | 'bone' | 'immune' | 'hormones';

export interface MicroDef {
  key: string;
  label: string;
  unit: 'mg' | 'mcg';
  rda: number;
  group: MicroGroup;
  cats: CategoryKey[];
}

/** All tracked micronutrients with their NIH RDA and wellness-category links. */
export const MICROS: MicroDef[] = [
  // Vitamins
  { key: 'b1', label: 'B1 (Thiamine)', unit: 'mg', rda: 1.2, group: 'vitamin', cats: ['energy', 'brain'] },
  { key: 'b2', label: 'B2 (Riboflavin)', unit: 'mg', rda: 1.3, group: 'vitamin', cats: ['energy', 'skin'] },
  { key: 'b3', label: 'B3 (Niacin)', unit: 'mg', rda: 16, group: 'vitamin', cats: ['energy', 'brain'] },
  { key: 'b5', label: 'B5 (Pantothenic Acid)', unit: 'mg', rda: 5, group: 'vitamin', cats: ['energy'] },
  { key: 'b6', label: 'B6 (Pyridoxine)', unit: 'mg', rda: 1.3, group: 'vitamin', cats: ['brain', 'energy', 'immune'] },
  { key: 'b7', label: 'B7 (Biotin)', unit: 'mcg', rda: 30, group: 'vitamin', cats: ['skin', 'energy'] },
  { key: 'folate', label: 'Folate', unit: 'mcg', rda: 400, group: 'vitamin', cats: ['brain', 'hormones'] },
  { key: 'b12', label: 'B12 (Cobalamin)', unit: 'mcg', rda: 2.4, group: 'vitamin', cats: ['energy', 'brain'] },
  { key: 'choline', label: 'Choline', unit: 'mg', rda: 550, group: 'vitamin', cats: ['brain'] },
  { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg', rda: 900, group: 'vitamin', cats: ['skin', 'immune'] },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', rda: 90, group: 'vitamin', cats: ['immune', 'skin'] },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', rda: 15, group: 'vitamin', cats: ['bone', 'immune', 'hormones'] },
  { key: 'vitaminE', label: 'Vitamin E', unit: 'mg', rda: 15, group: 'vitamin', cats: ['skin', 'immune'] },
  { key: 'vitaminK', label: 'Vitamin K', unit: 'mcg', rda: 120, group: 'vitamin', cats: ['bone'] },
  // Minerals
  { key: 'calcium', label: 'Calcium', unit: 'mg', rda: 1000, group: 'mineral', cats: ['bone', 'muscle'] },
  { key: 'copper', label: 'Copper', unit: 'mg', rda: 0.9, group: 'mineral', cats: ['immune', 'energy'] },
  { key: 'iron', label: 'Iron', unit: 'mg', rda: 8, group: 'mineral', cats: ['energy', 'immune'] },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', rda: 400, group: 'mineral', cats: ['muscle', 'bone', 'sleep'] },
  { key: 'manganese', label: 'Manganese', unit: 'mg', rda: 2.3, group: 'mineral', cats: ['bone'] },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg', rda: 700, group: 'mineral', cats: ['bone'] },
  { key: 'potassium', label: 'Potassium', unit: 'mg', rda: 3400, group: 'mineral', cats: ['muscle', 'sleep'] },
  { key: 'selenium', label: 'Selenium', unit: 'mcg', rda: 55, group: 'mineral', cats: ['immune', 'hormones'] },
  { key: 'sodium', label: 'Sodium', unit: 'mg', rda: 2300, group: 'mineral', cats: ['muscle'] },
  { key: 'zinc', label: 'Zinc', unit: 'mg', rda: 11, group: 'mineral', cats: ['immune', 'hormones', 'muscle'] },
];

export const MICRO_KEYS = MICROS.map(m => m.key);
export const VITAMINS = MICROS.filter(m => m.group === 'vitamin');
export const MINERALS = MICROS.filter(m => m.group === 'mineral');
export const MICRO_BY_KEY: Record<string, MicroDef> = Object.fromEntries(MICROS.map(m => [m.key, m]));

export const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: 'brain', label: 'Brainpower', icon: '🧠' },
  { key: 'muscle', label: 'Muscles', icon: '💪' },
  { key: 'skin', label: 'Skin, Hair & Nails', icon: '✨' },
  { key: 'sleep', label: 'Sleep & Recovery', icon: '😴' },
  { key: 'energy', label: 'Energy', icon: '⚡' },
  { key: 'bone', label: 'Bone Health', icon: '🦴' },
  { key: 'immune', label: 'Immune System', icon: '🛡️' },
  { key: 'hormones', label: 'Hormones & Libido', icon: '❤️' },
];

/** % of RDA for one nutrient, capped display value handled by caller. */
export function percentOf(key: string, amount: number): number {
  const def = MICRO_BY_KEY[key];
  if (!def || def.rda <= 0) return 0;
  return (amount / def.rda) * 100;
}

/** Average % across a nutrient group (vitamins or minerals), each capped at 100. */
export function groupPercent(totals: Record<string, number>, group: MicroGroup): number {
  const defs = MICROS.filter(m => m.group === group);
  if (defs.length === 0) return 0;
  const sum = defs.reduce((acc, d) => acc + Math.min(100, percentOf(d.key, totals[d.key] || 0)), 0);
  return Math.round(sum / defs.length);
}

/** Average % across the nutrients that drive a wellness category, each capped at 100. */
export function categoryPercent(totals: Record<string, number>, cat: CategoryKey): number {
  const defs = MICROS.filter(m => m.cats.includes(cat));
  if (defs.length === 0) return 0;
  const sum = defs.reduce((acc, d) => acc + Math.min(100, percentOf(d.key, totals[d.key] || 0)), 0);
  return Math.round(sum / defs.length);
}

/** Parse a stored micros JSON blob into a number map (empty on bad input). */
export function parseMicros(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      const out: Record<string, number> = {};
      for (const k of MICRO_KEYS) {
        const v = Number(obj[k]);
        if (isFinite(v) && v > 0) out[k] = v;
      }
      return out;
    }
  } catch {
    // Malformed — treat as no micro data.
  }
  return {};
}
