/** Micronutrient reference data. RDAs from the NIH Office of Dietary Supplements
 * fact sheets (adult defaults). Amounts are tracked in each nutrient's display
 * unit (mg or mcg). Not medical advice. */

/** 'other' covers tracked nutrients that are neither a vitamin nor a mineral
 * (omega-3 is a fatty acid, tryptophan an amino acid). They feed the wellness
 * categories but are deliberately excluded from the Vitamins/Minerals lists
 * and their completeness rings. */
export type MicroGroup = 'vitamin' | 'mineral' | 'other';
export type CategoryKey = 'brain' | 'muscle' | 'skin' | 'sleep' | 'energy' | 'bone' | 'immune' | 'hormones';

export interface MicroDef {
  key: string;
  label: string;
  unit: 'mg' | 'mcg' | 'g';
  rda: number;
  group: MicroGroup;
  cats: CategoryKey[];
}

/** All tracked micronutrients with their NIH RDA and wellness-category links. */
export const MICROS: MicroDef[] = [
  // Vitamins
  { key: 'b1', label: 'B1 (Thiamine)', unit: 'mg', rda: 1.2, group: 'vitamin', cats: ['energy'] },
  { key: 'b2', label: 'B2 (Riboflavin)', unit: 'mg', rda: 1.3, group: 'vitamin', cats: ['energy'] },
  { key: 'b3', label: 'B3 (Niacin)', unit: 'mg', rda: 16, group: 'vitamin', cats: ['energy'] },
  { key: 'b5', label: 'B5 (Pantothenic Acid)', unit: 'mg', rda: 5, group: 'vitamin', cats: [] },
  { key: 'b6', label: 'B6 (Pyridoxine)', unit: 'mg', rda: 1.3, group: 'vitamin', cats: ['brain', 'sleep'] },
  { key: 'b7', label: 'B7 (Biotin)', unit: 'mcg', rda: 30, group: 'vitamin', cats: [] },
  { key: 'folate', label: 'B9 (Folate)', unit: 'mcg', rda: 400, group: 'vitamin', cats: ['brain', 'energy'] },
  { key: 'b12', label: 'B12 (Cobalamin)', unit: 'mcg', rda: 2.4, group: 'vitamin', cats: ['brain', 'muscle', 'energy', 'immune', 'hormones'] },
  { key: 'choline', label: 'Choline', unit: 'mg', rda: 550, group: 'vitamin', cats: ['brain'] },
  { key: 'omega3', label: 'Omega-3', unit: 'g', rda: 1.6, group: 'other', cats: ['brain', 'skin', 'immune'] },
  { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg', rda: 900, group: 'vitamin', cats: ['skin', 'immune', 'hormones'] },
  { key: 'vitaminC', label: 'Vitamin C (Ascorbic Acid)', unit: 'mg', rda: 90, group: 'vitamin', cats: ['skin', 'immune'] },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', rda: 20, group: 'vitamin', cats: ['brain', 'muscle', 'sleep', 'bone', 'immune', 'hormones'] },
  { key: 'vitaminE', label: 'Vitamin E', unit: 'mg', rda: 15, group: 'vitamin', cats: ['skin'] },
  { key: 'vitaminK', label: 'Vitamin K', unit: 'mcg', rda: 120, group: 'vitamin', cats: ['bone'] },
  // Minerals
  { key: 'calcium', label: 'Calcium', unit: 'mg', rda: 1000, group: 'mineral', cats: ['sleep', 'muscle', 'bone'] },
  { key: 'copper', label: 'Copper', unit: 'mcg', rda: 900, group: 'mineral', cats: ['skin', 'energy', 'immune'] },
  { key: 'iron', label: 'Iron', unit: 'mg', rda: 8, group: 'mineral', cats: ['brain', 'skin', 'muscle', 'energy', 'hormones'] },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', rda: 400, group: 'mineral', cats: ['brain', 'muscle', 'sleep', 'energy', 'bone', 'hormones'] },
  { key: 'manganese', label: 'Manganese', unit: 'mg', rda: 2.3, group: 'mineral', cats: ['bone'] },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg', rda: 700, group: 'mineral', cats: ['bone'] },
  { key: 'potassium', label: 'Potassium', unit: 'mg', rda: 3400, group: 'mineral', cats: ['muscle', 'sleep', 'energy', 'bone'] },
  { key: 'selenium', label: 'Selenium', unit: 'mcg', rda: 55, group: 'mineral', cats: ['skin', 'hormones'] },
  { key: 'sodium', label: 'Sodium', unit: 'mg', rda: 1500, group: 'mineral', cats: ['muscle', 'sleep', 'energy'] },
  { key: 'zinc', label: 'Zinc', unit: 'mg', rda: 11, group: 'mineral', cats: ['brain', 'skin', 'muscle', 'immune', 'hormones'] },
  { key: 'iodine', label: 'Iodine', unit: 'mcg', rda: 150, group: 'mineral', cats: [] },
  { key: 'fluoride', label: 'Fluoride', unit: 'mg', rda: 3, group: 'mineral', cats: [] },
  { key: 'sulfur', label: 'Sulfur', unit: 'mg', rda: 850, group: 'mineral', cats: [] },
  { key: 'chloride', label: 'Chloride', unit: 'mg', rda: 1800, group: 'mineral', cats: [] },
  { key: 'tryptophan', label: 'Tryptophan', unit: 'g', rda: 0.3, group: 'other', cats: ['sleep'] },
];

/** A row on a wellness-category screen. The design mixes micronutrients with
 * two macro rows (calories, protein), which are read from the user's targets
 * rather than an RDA. */
export type CategoryRow =
  | { kind: 'micro'; key: string }
  | { kind: 'calories' }
  | { kind: 'protein' }
  | { kind: 'fat' };

const micro = (key: string): CategoryRow => ({ kind: 'micro', key });

/** Exact per-category rows, in the order the Figma frames list them. */
export const CATEGORY_ROWS: Record<CategoryKey, CategoryRow[]> = {
  brain: [
    micro('choline'), micro('omega3'), micro('iron'), micro('magnesium'), micro('b6'),
    micro('b12'), micro('zinc'), micro('vitaminD'), micro('folate'), { kind: 'calories' },
  ],
  muscle: [
    { kind: 'protein' }, { kind: 'calories' }, micro('iron'), micro('magnesium'),
    micro('b12'), micro('potassium'), micro('sodium'), micro('zinc'),
    micro('vitaminD'), micro('calcium'),
  ],
  skin: [
    { kind: 'protein' }, micro('omega3'), micro('copper'), micro('iron'), micro('selenium'),
    micro('zinc'), micro('vitaminA'), micro('vitaminC'), micro('vitaminE'),
  ],
  sleep: [
    micro('calcium'), micro('b6'), micro('magnesium'), micro('potassium'),
    micro('sodium'), micro('vitaminD'), micro('tryptophan'),
  ],
  energy: [
    { kind: 'calories' }, micro('b1'), micro('b2'), micro('b3'), micro('folate'),
    micro('b12'), micro('copper'), micro('iron'), micro('magnesium'),
    micro('potassium'), micro('sodium'),
  ],
  bone: [
    micro('calcium'), micro('magnesium'), micro('manganese'), micro('phosphorus'),
    micro('potassium'), micro('vitaminD'), micro('vitaminK'), { kind: 'protein' },
  ],
  immune: [
    micro('copper'), micro('b12'), micro('zinc'), micro('vitaminA'),
    micro('vitaminC'), micro('vitaminD'), micro('omega3'),
  ],
  hormones: [
    { kind: 'protein' }, { kind: 'calories' }, { kind: 'fat' }, micro('iron'),
    micro('magnesium'), micro('selenium'), micro('zinc'), micro('b12'),
    micro('vitaminA'), micro('vitaminD'),
  ],
};
export const MICRO_KEYS = MICROS.map(m => m.key);
export const VITAMINS = MICROS.filter(m => m.group === 'vitamin');
export const MINERALS = MICROS.filter(m => m.group === 'mineral');
export const OTHER_NUTRIENTS = MICROS.filter(m => m.group === 'other');
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
