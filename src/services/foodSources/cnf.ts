/** Health Canada's Canadian Nutrient File — https://food-nutrition.canada.ca/api/canadian-nutrient-file/
 *
 * No API key. The API has no text search, so the full food list (~5,700
 * names, ~470 KB) is fetched once per app session and matched on the device;
 * nutrients are then fetched for the best few matches. All values are per 100 g. */
import type { Food } from '@/types';
import { fetchJson, makeFood, nutrientsToFields, type RawNutrient } from './common';

const BASE = 'https://food-nutrition.canada.ca/api/canadian-nutrient-file';

/** CNF nutrient_name_id → [USDA-equivalent nutrient number, unit]. CNF's own
 * nutrient_code matches USDA's numbering; the ids mostly do too. */
const CNF_NUTRIENTS: Record<number, [string, string]> = {
  208: ['208', 'kcal'], 203: ['203', 'g'], 204: ['204', 'g'], 205: ['205', 'g'],
  291: ['291', 'g'], 269: ['269', 'g'], 307: ['307', 'mg'],
  301: ['301', 'mg'], 303: ['303', 'mg'], 304: ['304', 'mg'], 305: ['305', 'mg'],
  306: ['306', 'mg'], 309: ['309', 'mg'], 312: ['312', 'mg'], 315: ['315', 'mg'], 317: ['317', 'mcg'],
  814: ['320', 'mcg'], 323: ['323', 'mg'], 339: ['328', 'mcg'], 324: ['324', 'IU'],
  401: ['401', 'mg'], 404: ['404', 'mg'], 405: ['405', 'mg'], 406: ['406', 'mg'],
  410: ['410', 'mg'], 415: ['415', 'mg'], 416: ['416', 'mcg'], 815: ['435', 'mcg'],
  418: ['418', 'mcg'], 862: ['421', 'mg'], 430: ['430', 'mcg'], 501: ['501', 'g'],
  868: ['902', 'g'], 831: ['851', 'g'], 619: ['619', 'g'], 629: ['629', 'g'], 621: ['621', 'g'], 631: ['631', 'g'],
};

interface CnfFood { food_code: number; food_description: string }
interface CnfAmount { nutrient_name_id: number; nutrient_value: number }

let foodList: Promise<CnfFood[]> | null = null;

function loadFoodList(): Promise<CnfFood[]> {
  if (!foodList) {
    foodList = fetchJson<CnfFood[]>(`${BASE}/food/?lang=en&type=json`, {}, 15000)
      .catch(e => { foodList = null; throw e; }); // retry on the next search
  }
  return foodList;
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Every query word must appear as a word prefix; earlier and shorter wins. */
function score(desc: string, q: string[]): number {
  const w = words(desc);
  let s = 0;
  for (const t of q) {
    const i = w.findIndex(x => x.startsWith(t));
    if (i < 0) return -1;
    s += 10 - Math.min(i, 8);
  }
  return s - desc.length / 20;
}

async function nutrientsFor(f: CnfFood): Promise<Food> {
  const rows = await fetchJson<CnfAmount[]>(`${BASE}/nutrientamount/?id=${f.food_code}&lang=en&type=json`);
  const raw: RawNutrient[] = [];
  for (const r of rows) {
    const m = CNF_NUTRIENTS[r.nutrient_name_id];
    if (m) raw.push({ number: m[0], value: Number(r.nutrient_value), unit: m[1] });
  }
  const { macros, micros } = nutrientsToFields(raw, 1);
  return makeFood({
    name: f.food_description, source: 'cnf', sourceId: String(f.food_code),
    servingSize: 100, servingUnit: 'g', macros, micros,
  });
}

export async function searchCnf(query: string, limit = 5): Promise<Food[]> {
  const q = words(query);
  if (!q.length) return [];
  const list = await loadFoodList();
  const best = list
    .map(f => ({ f, s: score(f.food_description, q) }))
    .filter(x => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit);
  const settled = await Promise.allSettled(best.map(x => nutrientsFor(x.f)));
  return settled.flatMap(r => (r.status === 'fulfilled' ? [r.value] : []));
}
