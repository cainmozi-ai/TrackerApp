import type { Food, FoodSourceId } from '@/types';
import { MICRO_BY_KEY } from '@/utils/micronutrients';

/** Display and attribution details for every place food data can come from. */
export const SOURCE_META: Record<FoodSourceId, { label: string; short: string; about: string; url?: string }> = {
  usda: {
    label: 'USDA FoodData Central', short: 'USDA',
    about: 'US Department of Agriculture lab-analysed whole foods, survey foods and branded labels.',
    url: 'https://fdc.nal.usda.gov/',
  },
  cnf: {
    label: 'Canadian Nutrient File', short: 'CNF',
    about: 'Health Canada’s reference database of about 5,700 foods with up to 150 nutrients each.',
    url: 'https://food-nutrition.canada.ca/cnf-fce/',
  },
  off: {
    label: 'Open Food Facts', short: 'OFF',
    about: 'Crowd-sourced packaged-food labels from around the world.',
    url: 'https://world.openfoodfacts.org/',
  },
  dsld: {
    label: 'NIH Dietary Supplement Label Database', short: 'NIH DSLD',
    about: 'Label contents of dietary supplements sold in the US, from the NIH Office of Dietary Supplements.',
    url: 'https://dsld.od.nih.gov/',
  },
  custom: { label: 'Your food', short: 'Custom', about: 'A food you entered yourself.' },
  ai: { label: 'AI photo estimate', short: 'AI', about: 'Estimated from a photo. Treat as approximate.' },
};

/** Fields a food source can fill. Macro keys map onto Food's own columns;
 * everything else is a micronutrient key from utils/micronutrients. */
export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium';

/** USDA nutrient numbers (the Canadian Nutrient File uses the same codes) →
 * our field. Where several numbers describe one nutrient, the first one
 * present wins, so list the preferred form first. */
export const NUTRIENT_NUMBERS: { field: MacroKey | string; numbers: string[] }[] = [
  { field: 'calories', numbers: ['208', '958', '957'] },
  { field: 'protein', numbers: ['203'] },
  { field: 'fat', numbers: ['204'] },
  { field: 'carbs', numbers: ['205', '205.2'] },
  { field: 'fiber', numbers: ['291'] },
  { field: 'sugar', numbers: ['269', '269.3'] },
  { field: 'sodium', numbers: ['307'] },
  { field: 'calcium', numbers: ['301'] },
  { field: 'iron', numbers: ['303'] },
  { field: 'magnesium', numbers: ['304'] },
  { field: 'phosphorus', numbers: ['305'] },
  { field: 'potassium', numbers: ['306'] },
  { field: 'zinc', numbers: ['309'] },
  { field: 'copper', numbers: ['312'] },
  { field: 'fluoride', numbers: ['313'] },
  { field: 'iodine', numbers: ['314'] },
  { field: 'manganese', numbers: ['315'] },
  { field: 'selenium', numbers: ['317'] },
  { field: 'vitaminA', numbers: ['320'] },
  { field: 'vitaminE', numbers: ['323'] },
  { field: 'vitaminD', numbers: ['328', '324'] },
  { field: 'vitaminC', numbers: ['401'] },
  { field: 'b1', numbers: ['404'] },
  { field: 'b2', numbers: ['405'] },
  { field: 'b3', numbers: ['406'] },
  { field: 'b5', numbers: ['410'] },
  { field: 'b6', numbers: ['415'] },
  { field: 'b7', numbers: ['416'] },
  { field: 'folate', numbers: ['435', '417'] },
  { field: 'b12', numbers: ['418'] },
  { field: 'choline', numbers: ['421'] },
  { field: 'vitaminK', numbers: ['430'] },
  { field: 'tryptophan', numbers: ['501'] },
];

/** Omega-3 is reported as separate fatty acids; total n-3 (902) if present,
 * otherwise ALA (851, or undifferentiated 18:3 619) + EPA + DHA + DPA. */
const OMEGA3_TOTAL = '902';
const OMEGA3_ALA = ['851', '619'];
const OMEGA3_LONG_CHAIN = ['629', '621', '631'];

/** Convert between mass units, plus IU for vitamin D (the only IU value the
 * food databases report that we store). Returns null for units we can't use. */
export function convertAmount(value: number, fromUnit: string, toUnit: string, field?: string): number | null {
  const from = normUnit(fromUnit);
  const to = normUnit(toUnit);
  if (!from || !to) return null;
  if (from === 'iu') return field === 'vitaminD' && to === 'mcg' ? value / 40 : null;
  if (from === 'kcal' || to === 'kcal') return from === to ? value : null;
  if (from === 'kj') return to === 'kcal' ? value / 4.184 : null;
  const scale: Record<string, number> = { g: 1, mg: 1e-3, mcg: 1e-6 };
  if (!(from in scale) || !(to in scale)) return null;
  return (value * scale[from]) / scale[to];
}

export function normUnit(u: string): string | null {
  const s = u.trim().toLowerCase().replace(/\(s\)$/, '');
  if (/^(µg|ug|mcg|microgram)/.test(s)) return 'mcg';
  if (/^(mg|milligram)/.test(s)) return 'mg';
  if (/^(g|grm|gram)$/.test(s) || s === 'gram') return 'g';
  if (/^(kcal|calorie|\{calories\})/.test(s)) return 'kcal';
  if (/^kj/.test(s)) return 'kj';
  if (/^iu/.test(s)) return 'iu';
  return null;
}

/** The unit each field is stored in. */
export function unitFor(field: string): string {
  if (field === 'calories') return 'kcal';
  if (field === 'sodium') return 'mg';
  if (['protein', 'fat', 'carbs', 'fiber', 'sugar'].includes(field)) return 'g';
  return MICRO_BY_KEY[field]?.unit ?? 'mg';
}

export interface RawNutrient { number: string; value: number; unit: string }

/** Turn a list of per-basis nutrient readings into Food fields, scaled by
 * `scale` (e.g. 0.3 to go from per-100 g to a 30 g serving). */
export function nutrientsToFields(raw: RawNutrient[], scale: number): { macros: Partial<Record<MacroKey, number>>; micros: Record<string, number> } {
  const byNumber = new Map<string, RawNutrient>();
  for (const r of raw) if (isFinite(r.value) && r.value >= 0 && !byNumber.has(r.number)) byNumber.set(r.number, r);

  const macros: Partial<Record<MacroKey, number>> = {};
  const micros: Record<string, number> = {};
  for (const { field, numbers } of NUTRIENT_NUMBERS) {
    for (const n of numbers) {
      const r = byNumber.get(n);
      if (!r) continue;
      const v = convertAmount(r.value, r.unit, unitFor(field), field);
      if (v == null) continue;
      const scaled = v * scale;
      if (isMacro(field)) macros[field] = scaled;
      else micros[field] = round(scaled);
      break;
    }
  }

  const grams = (n: string) => {
    const r = byNumber.get(n);
    return r ? convertAmount(r.value, r.unit, 'g') : null;
  };
  const total = grams(OMEGA3_TOTAL);
  if (total != null) micros.omega3 = round(total * scale);
  else {
    const ala = OMEGA3_ALA.map(grams).find(v => v != null) ?? null;
    const lc = OMEGA3_LONG_CHAIN.map(grams).filter((v): v is number => v != null);
    if (ala != null || lc.length) micros.omega3 = round(((ala ?? 0) + lc.reduce((a, b) => a + b, 0)) * scale);
  }
  return { macros, micros };
}

const MACRO_KEYS: MacroKey[] = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
function isMacro(field: string): field is MacroKey {
  return (MACRO_KEYS as string[]).includes(field);
}

/** Round to 3 significant-ish decimals so tiny trace amounts survive. */
export function round(v: number): number {
  if (v >= 100) return Math.round(v);
  if (v >= 1) return Math.round(v * 100) / 100;
  return Math.round(v * 1000) / 1000;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Build a Food from source fields. */
export function makeFood(args: {
  name: string; brand?: string | null; barcode?: string | null;
  source: FoodSourceId; sourceId: string;
  servingSize: number; servingUnit: string;
  macros: Partial<Record<MacroKey, number>>; micros: Record<string, number>;
}): Food {
  const { macros } = args;
  return {
    id: 0,
    name: args.name,
    brand: args.brand || null,
    barcode: args.barcode || null,
    calories: Math.round(macros.calories ?? 0),
    protein: r1(macros.protein ?? 0),
    carbs: r1(macros.carbs ?? 0),
    fat: r1(macros.fat ?? 0),
    fiber: macros.fiber != null ? r1(macros.fiber) : null,
    sugar: macros.sugar != null ? r1(macros.sugar) : null,
    sodium: macros.sodium != null ? Math.round(macros.sodium) : null,
    servingSize: args.servingSize,
    servingUnit: args.servingUnit,
    micros: args.micros,
    source: args.source,
    sourceId: args.sourceId,
    isCustom: false,
    isFavorite: false,
    createdAt: '',
  };
}

/** fetch() with a timeout, so one slow database can't stall the search. */
export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 9000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new SourceError(res.status === 429 ? 'rate-limit' : 'http', `HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof SourceError) throw e;
    throw new SourceError(ctrl.signal.aborted ? 'timeout' : 'network', e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(t);
  }
}

export class SourceError extends Error {
  constructor(public kind: 'rate-limit' | 'http' | 'timeout' | 'network', message: string) {
    super(message);
  }
}

/** Title-case the ALL-CAPS names some databases use. */
export function tidyName(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s,(/-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}
