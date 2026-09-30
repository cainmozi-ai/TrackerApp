/**
 * Rebuilds src/data/foods.json — the food library bundled with the app — from
 * USDA FoodData Central's SR Legacy table, which has the most complete
 * vitamin and mineral profiles of USDA's data types.
 *
 * Usage:  npm run build:foods
 * Needs EXPO_PUBLIC_USDA_API_KEY in .env.local (or the environment).
 *
 * To add a food: find its SR Legacy fdcId at https://fdc.nal.usda.gov/,
 * add [display name, fdcId] to FOODS below and re-run. Display names are the
 * match key for foods already on users' devices, so don't rename existing ones.
 *
 * The nutrient-number mapping mirrors src/services/foodSources/common.ts.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/data/foods.json');

/** [name shown in the app, USDA SR Legacy fdcId]. Values are per 100 g. */
const FOODS = [
  ['Chicken Breast, cooked', 171477],
  ['Chicken Thigh, cooked', 172388],
  ['Ground Beef, 85% lean, cooked', 174032],
  ['Salmon, cooked', 175168],
  ['Tuna, canned in water', 171986],
  ['Egg, whole, cooked', 173424],
  ['Whole Milk', 171265],
  ['Greek Yogurt, plain nonfat', 170894],
  ['Cottage Cheese, low-fat', 172182],
  ['Tofu, firm', 172475],
  ['Whey Protein Powder', 173180],
  ['Shrimp, cooked', 171971], // fuller profile than 175180 (which lacks B12, selenium, etc.)
  ['Turkey Breast, cooked', 174516],
  ['Sardines, canned', 175139],
  ['White Rice, cooked', 168878],
  ['Brown Rice, cooked', 169704],
  ['Oats, dry rolled', 169705],
  ['Whole Wheat Bread', 172688],
  ['Pasta, cooked', 169737],
  ['Quinoa, cooked', 168917],
  ['Potato, baked with skin', 170093],
  ['Sweet Potato, baked', 168483],
  ['Spinach, raw', 168462],
  ['Broccoli, cooked', 169967],
  ['Kale, raw', 168421],
  ['Carrot, raw', 170393],
  ['Bell Pepper, red', 170108],
  ['Tomato, raw', 170457],
  ['Onion, raw', 170000],
  ['Mushroom, white, raw', 169251],
  ['Avocado', 171705],
  ['Green Beans, cooked', 169141],
  ['Cucumber, raw', 168409],
  ['Edamame, cooked', 168411],
  ['Banana', 173944],
  ['Apple, with skin', 171688],
  ['Orange', 169097],
  ['Blueberries', 171711],
  ['Strawberries', 167762],
  ['Almonds', 170567],
  ['Peanut Butter', 174266],
  ['Olive Oil', 171413],
  ['Walnuts', 170187],
  ['Chia Seeds', 170554],
  ['Pumpkin Seeds', 170556],
  ['Cashews', 170162],
  ['Black Beans, cooked', 173735],
  ['Lentils, cooked', 172421],
  ['Chickpeas, cooked', 173757],
  ['Cheddar Cheese', 173414],
];

/** Our field → [USDA nutrient numbers, first present wins], and its unit. */
const FIELDS = {
  calories: [['208'], 'kcal'],
  protein: [['203'], 'g'],
  fat: [['204'], 'g'],
  carbs: [['205'], 'g'],
  fiber: [['291'], 'g'],
  sugar: [['269'], 'g'],
  sodium: [['307'], 'mg'],
  calcium: [['301'], 'mg'],
  iron: [['303'], 'mg'],
  magnesium: [['304'], 'mg'],
  phosphorus: [['305'], 'mg'],
  potassium: [['306'], 'mg'],
  zinc: [['309'], 'mg'],
  copper: [['312'], 'mcg'],
  fluoride: [['313'], 'mg'],
  iodine: [['314'], 'mcg'],
  manganese: [['315'], 'mg'],
  selenium: [['317'], 'mcg'],
  vitaminA: [['320'], 'mcg'],
  vitaminE: [['323'], 'mg'],
  vitaminD: [['328', '324'], 'mcg'],
  vitaminC: [['401'], 'mg'],
  b1: [['404'], 'mg'],
  b2: [['405'], 'mg'],
  b3: [['406'], 'mg'],
  b5: [['410'], 'mg'],
  b6: [['415'], 'mg'],
  b7: [['416'], 'mcg'],
  folate: [['435', '417'], 'mcg'],
  b12: [['418'], 'mcg'],
  choline: [['421'], 'mg'],
  vitaminK: [['430'], 'mcg'],
  tryptophan: [['501'], 'g'],
};
const MACROS = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sugar', 'sodium'];
const OMEGA3_ALA = ['851', '619'];
const OMEGA3_LONG_CHAIN = ['629', '621', '631']; // EPA, DHA, DPA

const MASS = { g: 1, mg: 1e-3, mcg: 1e-6 };
function unitOf(u) {
  const s = u.toLowerCase();
  if (s === 'µg' || s === 'ug' || s === 'mcg') return 'mcg';
  if (s === 'mg') return 'mg';
  if (s === 'g') return 'g';
  if (s === 'kcal') return 'kcal';
  if (s === 'iu') return 'iu';
  return null;
}
function convert(value, from, to, field) {
  const f = unitOf(from);
  if (f === to) return value;
  if (f === 'iu') return field === 'vitaminD' && to === 'mcg' ? value / 40 : null;
  if (f in MASS && to in MASS) return (value * MASS[f]) / MASS[to];
  return null;
}
function round(v) {
  if (v >= 100) return Math.round(v);
  if (v >= 1) return Math.round(v * 100) / 100;
  return Math.round(v * 1000) / 1000;
}
const r1 = v => Math.round(v * 10) / 10;

function readKey() {
  if (process.env.EXPO_PUBLIC_USDA_API_KEY) return process.env.EXPO_PUBLIC_USDA_API_KEY.trim();
  const env = join(ROOT, '.env.local');
  const m = existsSync(env) && readFileSync(env, 'utf8').match(/^EXPO_PUBLIC_USDA_API_KEY=(.+)$/m);
  if (!m) throw new Error('Set EXPO_PUBLIC_USDA_API_KEY in .env.local first (see .env.example).');
  return m[1].trim();
}

async function fetchFoods(key, ids) {
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods?api_key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fdcIds: ids, format: 'full' }),
  });
  if (!res.ok) throw new Error(`USDA returned HTTP ${res.status}`);
  return res.json();
}

function toSeed(name, usda) {
  const byNumber = new Map();
  for (const n of usda.foodNutrients || []) {
    const num = n.nutrient?.number;
    if (num && typeof n.amount === 'number' && n.amount >= 0 && !byNumber.has(num)) {
      byNumber.set(num, { value: n.amount, unit: n.nutrient.unitName });
    }
  }
  const seed = { name, fdcId: usda.fdcId, usdaName: usda.description };
  const micros = {};
  for (const [field, [numbers, unit]] of Object.entries(FIELDS)) {
    let v = null;
    for (const num of numbers) {
      const r = byNumber.get(num);
      if (r) v = convert(r.value, r.unit, unit, field);
      if (v != null) break;
    }
    if (MACROS.includes(field)) {
      // Unreported macros stay null (unknown) rather than 0.
      seed[field] = v == null ? null : field === 'calories' || field === 'sodium' ? Math.round(v) : r1(v);
    } else if (v != null) {
      micros[field] = round(v);
    }
  }
  const grams = num => { const r = byNumber.get(num); return r ? convert(r.value, r.unit, 'g') : null; };
  const ala = OMEGA3_ALA.map(grams).find(v => v != null) ?? null;
  const longChain = OMEGA3_LONG_CHAIN.map(grams).filter(v => v != null);
  if (ala != null || longChain.length) micros.omega3 = round((ala ?? 0) + longChain.reduce((a, b) => a + b, 0));
  seed.micros = micros;
  return seed;
}

async function main() {
  const key = readKey();
  const byId = new Map();
  for (let i = 0; i < FOODS.length; i += 20) {
    for (const f of await fetchFoods(key, FOODS.slice(i, i + 20).map(([, id]) => id))) byId.set(f.fdcId, f);
  }
  const foods = FOODS.map(([name, id]) => {
    const usda = byId.get(id);
    if (!usda) throw new Error(`USDA has no food ${id} (${name})`);
    if (usda.dataType !== 'SR Legacy') throw new Error(`${id} (${name}) is ${usda.dataType}, expected SR Legacy`);
    return toSeed(name, usda);
  });
  // The version changes only when the data does, so the app re-applies the
  // library once after a real change and never on an unchanged rebuild.
  const version = createHash('sha1').update(JSON.stringify(foods)).digest('hex').slice(0, 12);
  const out = {
    version,
    source: 'USDA FoodData Central, SR Legacy (https://fdc.nal.usda.gov/). Values per 100 g.',
    foods,
  };
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  const counts = foods.map(f => Object.keys(f.micros).length);
  console.log(`Wrote ${foods.length} foods to src/data/foods.json (version ${version}).`);
  console.log(`Micronutrients per food: min ${Math.min(...counts)}, max ${Math.max(...counts)}, avg ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
