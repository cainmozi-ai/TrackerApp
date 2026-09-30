/** NIH Dietary Supplement Label Database — https://dsld.od.nih.gov/api-guide
 *
 * No API key. Search results don't include amounts, so each matching label is
 * fetched individually. One "serving" is the label's serving (e.g. 2 capsules).
 *
 * Label units are converted to the units NIH targets use:
 *  - vitamin D: 1 mcg = 40 IU
 *  - vitamin A: 1 IU retinol = 0.3 mcg RAE; 1 IU supplemental beta-carotene = 0.15 mcg RAE
 *  - vitamin E: 1 IU natural (d-alpha) = 0.67 mg; 1 IU synthetic (dl-alpha) = 0.45 mg
 *  - folic acid: 1 mcg = 1.7 mcg DFE
 * Two extra keys feed the upper-limit checks: `vitaminAPreformed` (retinol
 * forms only) and `folicAcid` (mcg of folic acid, the form the folate UL covers). */
import type { Food } from '@/types';
import { convertAmount, fetchJson, makeFood, normUnit, round, unitFor, type MacroKey } from './common';

const BASE = 'https://api.ods.od.nih.gov/dsld/v9';

interface DsldQuantity { quantity?: number; unit?: string; servingSizeOrder?: number }
interface DsldRow { name?: string; ingredientGroup?: string; quantity?: DsldQuantity[]; forms?: { name?: string }[]; nestedRows?: DsldRow[] }
interface DsldLabel {
  id: number;
  fullName?: string;
  brandName?: string;
  upcSku?: string;
  servingSizes?: { minQuantity?: number; unit?: string }[];
  ingredientRows?: DsldRow[];
}

/** Ingredient group → our field. Tested against the group (then the row name). */
const GROUPS: [RegExp, MacroKey | string][] = [
  [/^calories$/i, 'calories'],
  [/^protein$/i, 'protein'],
  [/^fat \(unspecified\)$|^total fat$/i, 'fat'],
  [/^carbohydrate|^total carbohydrate/i, 'carbs'],
  [/^(dietary )?fiber$/i, 'fiber'],
  [/^(total )?sugars?$/i, 'sugar'],
  [/^sodium$/i, 'sodium'],
  [/^vitamin a$/i, 'vitaminA'],
  [/^vitamin c$/i, 'vitaminC'],
  [/^vitamin d/i, 'vitaminD'],
  [/^vitamin e$/i, 'vitaminE'],
  [/^vitamin k/i, 'vitaminK'],
  [/^thiamin|^vitamin b1$/i, 'b1'],
  [/^riboflavin|^vitamin b2$/i, 'b2'],
  [/^niacin|^vitamin b3$/i, 'b3'],
  [/^pantothenic|^vitamin b5$/i, 'b5'],
  [/^vitamin b6$/i, 'b6'],
  [/^biotin$/i, 'b7'],
  [/^folate|^folic acid$/i, 'folate'],
  [/^vitamin b12$/i, 'b12'],
  [/^choline$/i, 'choline'],
  [/^omega-3$/i, 'omega3'],
  [/^(epa|dha|dpa)\b|eicosapentaenoic|docosahexaenoic/i, 'omega3Part'],
  [/^calcium$/i, 'calcium'],
  [/^copper$/i, 'copper'],
  [/^iron$/i, 'iron'],
  [/^magnesium$/i, 'magnesium'],
  [/^manganese$/i, 'manganese'],
  [/^phosphorus$/i, 'phosphorus'],
  [/^potassium$/i, 'potassium'],
  [/^selenium$/i, 'selenium'],
  [/^zinc$/i, 'zinc'],
  [/^iodine$/i, 'iodine'],
  [/^chloride$/i, 'chloride'],
  [/^fluoride$/i, 'fluoride'],
];

const MACROS: string[] = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sugar', 'sodium'];

function fieldFor(row: DsldRow): string | null {
  for (const text of [row.ingredientGroup, row.name]) {
    if (!text) continue;
    const hit = GROUPS.find(([re]) => re.test(text.trim()));
    if (hit) return hit[1];
  }
  return null;
}

const formsOf = (row: DsldRow) => (row.forms || []).map(f => f.name || '').join(' ').toLowerCase()
  + ' ' + (row.name || '').toLowerCase();

/** Convert one label row to our unit, plus any form-specific extras. Null when the unit can't be used. */
function convertRow(field: string, qty: number, unitRaw: string, row: DsldRow): { value: number; extra?: Record<string, number> } | null {
  const unit = normUnit(unitRaw);
  const forms = formsOf(row);
  const isCarotenoid = /carot|cryptoxanthin/.test(forms);
  const isRetinol = /retin/.test(forms);

  if (field === 'vitaminA') {
    let rae: number | null;
    if (unit === 'iu') rae = qty * (isCarotenoid && !isRetinol ? 0.15 : 0.3);
    else rae = convertAmount(qty, unitRaw, 'mcg');
    if (rae == null) return null;
    // Mixed or unnamed forms count as preformed — the cautious reading for the UL.
    return { value: rae, extra: { vitaminAPreformed: isCarotenoid && !isRetinol ? 0 : rae } };
  }
  if (field === 'vitaminE' && unit === 'iu') {
    const synthetic = /\bdl-|synthetic/.test(forms);
    return { value: qty * (synthetic ? 0.45 : 0.67) };
  }
  if (field === 'folate') {
    const mcg = convertAmount(qty, unitRaw, 'mcg');
    if (mcg == null) return null;
    const folic = /folic acid/.test(forms) && !/methyl|mthf|folinic|quatrefolic/.test(forms);
    const labelledDfe = /dfe/i.test(unitRaw);
    // Old labels list folic acid in plain mcg; newer ones already use DFE.
    const dfe = folic && !labelledDfe ? mcg * 1.7 : mcg;
    return { value: dfe, extra: { folicAcid: folic ? (labelledDfe ? mcg / 1.7 : mcg) : 0 } };
  }
  const v = convertAmount(qty, unitRaw, field === 'omega3Part' ? 'g' : unitFor(field), field);
  return v == null ? null : { value: v };
}

function flatten(rows: DsldRow[]): DsldRow[] {
  return rows.flatMap(r => [r, ...flatten(r.nestedRows || [])]);
}

function toFood(label: DsldLabel): Food {
  const macros: Partial<Record<MacroKey, number>> = {};
  const micros: Record<string, number> = {};
  let omegaParts = 0;

  for (const row of flatten(label.ingredientRows || [])) {
    const field = fieldFor(row);
    const q = (row.quantity || [])[0];
    if (!field || !q || q.quantity == null || !q.unit || !isFinite(q.quantity)) continue;
    const res = convertRow(field, q.quantity, q.unit, row);
    if (!res) continue;
    if (field === 'omega3Part') { omegaParts += res.value; continue; }
    if (MACROS.includes(field)) macros[field as MacroKey] = (macros[field as MacroKey] ?? 0) + res.value;
    else micros[field] = round((micros[field] ?? 0) + res.value);
    for (const [k, v] of Object.entries(res.extra ?? {})) micros[k] = round((micros[k] ?? 0) + v);
  }
  if (micros.omega3 == null && omegaParts > 0) micros.omega3 = round(omegaParts);

  const s = (label.servingSizes || [])[0];
  const servingQty = s?.minQuantity && s.minQuantity > 0 ? s.minQuantity : 1;
  // "Softgel(s)", "Gummy(ies)" → "softgel", "gummy"
  const servingUnit = (s?.unit || 'serving').replace(/\((s|es|ies)\)$/, '').toLowerCase();

  return makeFood({
    name: label.fullName || 'Supplement',
    brand: label.brandName || null,
    barcode: label.upcSku ? label.upcSku.replace(/\D/g, '') || null : null,
    source: 'dsld',
    sourceId: String(label.id),
    servingSize: servingQty,
    servingUnit: servingUnit === 'gram' ? 'g' : servingUnit,
    macros,
    micros,
  });
}

async function label(id: string | number): Promise<Food> {
  return toFood(await fetchJson<DsldLabel>(`${BASE}/label/${id}`));
}

interface Hit { _id: string }

/** On-market supplement labels matching the query. */
export async function searchDsld(query: string, limit = 6): Promise<Food[]> {
  const url = `${BASE}/search-filter?q=${encodeURIComponent(query)}&size=${limit}&status=1`;
  const data = await fetchJson<{ hits?: Hit[] }>(url);
  const settled = await Promise.allSettled((data.hits || []).map(h => label(h._id)));
  return settled.flatMap(r => (r.status === 'fulfilled' ? [r.value] : []));
}

/** Supplement lookup by the UPC printed on the bottle. DSLD stores UPC-A
 * codes spaced as printed ("0 74312 76274 1") and only matches that form. */
export async function lookupDsldBarcode(code: string): Promise<Food | null> {
  let digits = code.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('0')) digits = digits.slice(1); // EAN-13 → UPC-A
  if (digits.length !== 12) return null;
  const spaced = `${digits[0]} ${digits.slice(1, 6)} ${digits.slice(6, 11)} ${digits[11]}`;
  const data = await fetchJson<{ hits?: Hit[] }>(`${BASE}/search-filter?q=${encodeURIComponent(`"${spaced}"`)}&size=3`);
  for (const h of data.hits || []) {
    const food = await label(h._id).catch(() => null);
    if (food?.barcode && food.barcode.replace(/^0+/, '') === digits.replace(/^0+/, '')) return food;
  }
  return null;
}
