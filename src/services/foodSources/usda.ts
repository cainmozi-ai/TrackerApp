/** USDA FoodData Central — https://fdc.nal.usda.gov/api-guide
 *
 * Needs an API key. Without one the shared DEMO_KEY is used, which USDA
 * limits to a few dozen requests an hour per device, so branded foods are
 * only searched when a personal key is set (Open Food Facts covers branded
 * products otherwise). Get a free key at https://fdc.nal.usda.gov/api-key-signup
 * and add it to .env.local as EXPO_PUBLIC_USDA_API_KEY=your_key (see .env.example). */
import type { Food } from '@/types';
import { fetchJson, makeFood, nutrientsToFields, tidyName, type RawNutrient } from './common';

const BASE = 'https://api.nal.usda.gov/fdc/v1';
const USER_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY;
const API_KEY = USER_KEY || 'DEMO_KEY';
export const USDA_HAS_KEY = !!USER_KEY;

/** Lab-analysed and survey foods — generic items like "Chicken breast, roasted". */
const GENERIC_TYPES = 'Foundation,SR Legacy,Survey (FNDDS)';

interface FdcNutrient { nutrientNumber?: string; value?: number; unitName?: string }
interface FdcFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: FdcNutrient[];
}

function toFood(f: FdcFood): Food {
  const raw: RawNutrient[] = (f.foodNutrients || [])
    .filter(n => n.nutrientNumber && n.value != null && n.unitName)
    .map(n => ({ number: n.nutrientNumber!, value: n.value!, unit: n.unitName! }));

  // Search results report every data type per 100 g (or 100 ml). Branded
  // foods also carry the label's serving size, so scale to that when it's in
  // grams or millilitres; otherwise keep the 100 g basis.
  const unit = (f.servingSizeUnit || '').toLowerCase();
  const servingUnit = /^(g|grm)$/.test(unit) ? 'g' : /^(ml|mlt)$/.test(unit) ? 'ml' : null;
  const serving = servingUnit && f.servingSize && f.servingSize > 0 ? f.servingSize : null;
  const scale = serving ? serving / 100 : 1;
  const { macros, micros } = nutrientsToFields(raw, scale);

  return makeFood({
    name: tidyName(f.description),
    brand: f.brandName || f.brandOwner ? tidyName(f.brandName || f.brandOwner || '') : null,
    barcode: f.gtinUpc || null,
    source: 'usda',
    sourceId: String(f.fdcId),
    servingSize: serving ? Math.round(serving * 10) / 10 : 100,
    servingUnit: serving ? servingUnit! : 'g',
    macros,
    micros,
  });
}

/** Uses the POST form of the search: the GET form rejects most requests that
 * filter by several data types (intermittent HTTP 400s from USDA's gateway). */
async function search(query: string, dataType: string, pageSize: number): Promise<Food[]> {
  const data = await fetchJson<{ foods?: FdcFood[] }>(`${BASE}/foods/search?api_key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, dataType: dataType.split(','), pageSize }),
  });
  return (data.foods || []).map(toFood);
}

/** Generic foods, plus branded foods when a personal API key is set. */
export async function searchUsda(query: string): Promise<Food[]> {
  const [generic, branded] = await Promise.all([
    search(query, GENERIC_TYPES, 12),
    USDA_HAS_KEY ? search(query, 'Branded', 8).catch(() => []) : Promise.resolve([]),
  ]);
  return [...generic, ...branded];
}

/** Reference foods with full vitamin and mineral profiles (SR Legacy and the
 * FNDDS survey foods), per 100 g — used to estimate what labels leave out.
 * Searched separately: combined, FNDDS's many variants (granola bars, …)
 * push SR Legacy's plain foods out of the results. */
export async function searchUsdaReference(query: string, pageSize = 12): Promise<Food[]> {
  const settled = await Promise.allSettled([
    search(query, 'SR Legacy', pageSize),
    search(query, 'Survey (FNDDS)', pageSize),
  ]);
  const foods = settled.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  if (!foods.length && settled[0].status === 'rejected') throw settled[0].reason;
  return foods;
}

/** Branded-food lookup by UPC/EAN barcode. */
export async function lookupUsdaBarcode(code: string): Promise<Food | null> {
  const digits = code.replace(/\D/g, '');
  const foods = await search(digits, 'Branded', 5);
  // FDC stores 12-digit UPCs, sometimes zero-padded; compare without leading zeros.
  const strip = (s: string) => s.replace(/^0+/, '');
  return foods.find(f => f.barcode && strip(f.barcode) === strip(digits)) ?? null;
}
