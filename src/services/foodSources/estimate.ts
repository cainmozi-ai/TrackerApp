/** Estimate the vitamins and minerals a label leaves out.
 *
 * UK/EU labels (and most of Open Food Facts) list only energy, fat, carbs,
 * sugars, fibre, protein and salt; US labels add four minerals. To fill the
 * gap, find the closest generic reference food — USDA SR Legacy / FNDDS,
 * falling back to Health Canada's CNF when USDA is unavailable — and scale
 * its nutrients to the product. The match must share the product's head
 * noun and have a similar calorie density and macro make-up, otherwise no
 * estimate is made. Label values are never overwritten. */
import type { Food, FoodSourceId } from '@/types';
import { searchUsdaReference } from './usda';
import { searchCnf } from './cnf';
import { SOURCE_META } from './common';
import { nameMatch, norm, microCount } from './ranking';

/** Foods reporting fewer micronutrients than this are worth estimating. */
export const ESTIMATE_BELOW = 8;

/** A reference food needs at least this many micronutrients to be useful. */
const MIN_REFERENCE_MICROS = 12;

export interface MicroEstimate {
  /** e.g. `USDA: Chocolate, dark, 70-85% cacao solids` — stored with the food. */
  from: string;
  source: FoodSourceId;
  referenceName: string;
  /** Only the nutrients the product didn't already report, scaled to its serving. */
  micros: Record<string, number>;
}

/** Whether a food is worth estimating: little micronutrient data, and not a
 * supplement (whose label is the whole story). */
export function needsEstimate(food: Food): boolean {
  return food.source !== 'dsld' && !food.noEstimate && !food.microsEstimatedFrom && microCount(food) < ESTIMATE_BELOW
    && (food.calories > 0 || food.protein > 0 || food.carbs > 0 || food.fat > 0);
}

/** UK/other wording → the US/Canadian terms the reference databases use. */
const SYNONYMS: Record<string, string> = {
  wholemeal: 'whole wheat', wholegrain: 'whole grain', yoghurt: 'yogurt', yoghurts: 'yogurt',
  beanz: 'beans', crisps: 'potato chips', biscuit: 'cookie', biscuits: 'cookies',
  porridge: 'oatmeal', courgette: 'zucchini', aubergine: 'eggplant', mince: 'ground',
  prawn: 'shrimp', prawns: 'shrimp', coriander: 'cilantro', rocket: 'arugula', sweets: 'candy',
  choc: 'chocolate', skimmed: 'nonfat', oat: 'oats',
};

/** Multi-word phrases, replaced before the name is split into words. */
const PHRASES: [RegExp, string][] = [
  [/semi[- ]skimmed/g, 'reduced fat'],
  [/jacket potato/g, 'baked potato'],
  [/chocolate bars?/g, 'chocolate'], // a chocolate bar is chocolate; a granola bar is a bar
  [/\d+ ?% ?(cacao|cocoa)/g, 'dark chocolate'], // "Excellence 85% Cacao Rich Dark"
];

/** Marketing and packaging words that don't describe what the food is. */
const STOP = new Set([
  'the', 'original', 'classic', 'organic', 'bio', 'natural', 'style', 'medium', 'thick', 'thin',
  'sliced', 'rich', 'excellence', 'simple', 'so', 'and', 'with', 'of', 'a', 'extra', 'premium',
  'finest', 'luxury', 'deluxe', 'taste', 'pack', 'multipack', 'value', 'essential', 'essentials',
  'everyday', 'range', 'recipe', 'authentic', 'traditional', 'handmade', 'fairtrade', 'cocoa',
  'cacao', 'intense', 'mix', 'large', 'small', 'mini', 'family', 'size', 'new', 'improved',
  'x', 'g', 'kg', 'ml', 'l',
  // Texture/flavour adjectives: they'd otherwise end up as the "main" word.
  'smooth', 'crunchy', 'chunky', 'creamy', 'crispy', 'crisp', 'sweetened', 'unsweetened',
  'flavoured', 'flavored', 'lightly', 'deliciously',
]);

/** Kinds of prepared food. A reference food that is one of these, when the
 * product isn't, is a different food (granola vs a granola bar or cookie). */
const DISH_WORDS = new Set([
  'cookie', 'cookies', 'cake', 'cakes', 'bar', 'bars', 'pie', 'muffin', 'muffins', 'sandwich',
  'soup', 'cracker', 'crackers', 'bagel', 'bagels', 'pastry', 'pudding', 'parfait', 'salad',
  'snack', 'snacks', 'bites', 'pancake', 'pancakes', 'waffle', 'waffles', 'trail', 'smoothie',
  'shake', 'coated', 'covered', 'dip', 'sauce', 'pizza',
]);

/** A flavoured or sweetened reference is a worse match for a plain product. */
const FLAVOUR_WORDS = new Set(['flavoured', 'flavored', 'flavour', 'sweetened', 'vanilla', 'fruit', 'strawberry', 'honey']);

/** "enriched", "fortified", "with added vitamin D" — but not "without added". */
function isFortified(name: string): boolean {
  const n = norm(name);
  return /\b(fortified|enriched)\b/.test(n) || (/\badded\b/.test(n) && !/\bwithout added\b/.test(n));
}

function isDifferentDish(referenceName: string, productWords: Set<string>): boolean {
  return norm(referenceName).split(' ')
    .some(w => DISH_WORDS.has(w) && !productWords.has(w) && !productWords.has(w.replace(/e?s$/, '')) && !productWords.has(`${w}s`));
}

/** "Lizi's The Original Granola" → "granola"; "85% Dark Chocolate" → "dark chocolate". */
export function referenceQuery(food: Food): string {
  const brand = new Set(norm(food.brand).split(' ').filter(Boolean));
  let name = food.name.toLowerCase().replace(/['’]s\b/g, '');
  for (const [re, to] of PHRASES) name = name.replace(re, to);
  const words = norm(name).split(' ')
    .filter(w => w && !/^\d/.test(w) && !STOP.has(w) && !brand.has(w))
    .flatMap(w => (SYNONYMS[w] ?? w).split(' '));
  return [...new Set(words)].join(' ');
}

interface Profile { kcal: number; fat: number; carbs: number; protein: number; sugar: number | null; fiber: number | null }

/** Nutrition per 100 g, or null when the serving isn't measured in g/ml. */
function per100(f: Food): Profile | null {
  if (!(f.servingUnit === 'g' || f.servingUnit === 'ml') || !(f.servingSize > 0)) return null;
  const k = 100 / f.servingSize;
  return {
    kcal: f.calories * k, fat: f.fat * k, carbs: f.carbs * k, protein: f.protein * k,
    sugar: f.sugar != null ? f.sugar * k : null, fiber: f.fiber != null ? f.fiber * k : null,
  };
}

/** Share of energy from fat, carbs and protein — comparable across serving units. */
function energyShares(f: { fat: number; carbs: number; protein: number }) {
  const e = f.fat * 9 + f.carbs * 4 + f.protein * 4;
  return e > 0 ? [f.fat * 9 / e, f.carbs * 4 / e, f.protein * 4 / e] : null;
}

/** 0 = identical; grams of difference per 100 g (or percentage points of energy). */
function distance(product: Food, ref: Food): number | null {
  const p = per100(product);
  const r = per100(ref);
  if (p && r) {
    if (p.kcal > 0 && Math.abs(r.kcal - p.kcal) / p.kcal > 0.3) return null; // too different to trust
    let d = Math.abs(p.fat - r.fat) + Math.abs(p.carbs - r.carbs) + Math.abs(p.protein - r.protein);
    if (p.sugar != null && r.sugar != null) d += 0.5 * Math.abs(p.sugar - r.sugar);
    if (p.fiber != null && r.fiber != null) d += 0.5 * Math.abs(p.fiber - r.fiber);
    return d;
  }
  const a = energyShares(product);
  const b = energyShares(ref);
  if (!a || !b) return null;
  return 100 * (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]));
}

/** Find a reference food for `food` and scale its micronutrients. Returns
 * null when nothing is close enough — a wrong estimate is worse than none. */
export async function estimateMicros(food: Food): Promise<MicroEstimate | null> {
  const query = referenceQuery(food);
  const tokens = query.split(' ').filter(Boolean);
  if (!tokens.length) return null;
  const productWords = new Set(norm(food.name).split(' '));
  const sameKind = (name: string) => !isDifferentDish(name, productWords);

  // USDA first; Canada's file when USDA fails (e.g. the shared demo key's hourly limit).
  let refs = await searchUsdaReference(query).catch(() => [] as Food[]);
  if (refs.filter(r => microCount(r) >= MIN_REFERENCE_MICROS && sameKind(r.name)).length === 0) {
    refs = await searchCnf(query, 10, sameKind).catch(() => [] as Food[]);
  }

  let best: { ref: Food; rank: number } | null = null;
  for (const ref of refs) {
    if (microCount(ref) < MIN_REFERENCE_MICROS || !sameKind(ref.name)) continue;
    const m = nameMatch(ref, query, tokens);
    if (!m.headMatched) continue;
    const d = distance(food, ref);
    if (d == null || d > 45) continue;
    // Name fit first, then closeness of the macro profile. Fortified reference
    // foods would overstate vitamins an unfortified product doesn't have.
    const fortifiedMismatch = isFortified(ref.name) && !isFortified(food.name);
    const flavourMismatch = norm(ref.name).split(' ')
      .some(w => FLAVOUR_WORDS.has(w) && !productWords.has(w));
    const rank = m.score - d * 0.8 + (m.allMatched ? 10 : 0)
      - (fortifiedMismatch ? 20 : 0) - (flavourMismatch ? 12 : 0);
    if (!best || rank > best.rank) best = { ref, rank };
  }
  if (!best) return null;

  const { ref } = best;
  const p = per100(food);
  // Reference foods are per 100 g; scale by weight, or by energy when the
  // product's serving isn't in grams.
  const factor = p ? food.servingSize / 100 : ref.calories > 0 ? food.calories / ref.calories : 0;
  if (!(factor > 0)) return null;

  const micros: Record<string, number> = {};
  for (const [k, v] of Object.entries(ref.micros || {})) {
    if (food.micros?.[k] != null || k === 'sodium') continue;
    micros[k] = Math.round(v * factor * 1000) / 1000;
  }
  if (!Object.keys(micros).length) return null;
  const source = ref.source ?? 'usda';
  return { from: `${SOURCE_META[source].short}: ${ref.name}`, source, referenceName: ref.name, micros };
}

/** The food with an estimate merged in (label values kept). */
export function withEstimate(food: Food, est: MicroEstimate): Food {
  const labelKeys = new Set(Object.keys(food.micros || {}));
  return {
    ...food,
    micros: { ...est.micros, ...(food.micros || {}) },
    microsEstimatedFrom: est.from,
    microsEstimatedKeys: Object.keys(est.micros).filter(k => !labelKeys.has(k)),
  };
}
