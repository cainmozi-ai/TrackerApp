/** Micronutrient reference data.
 *
 * Targets (RDA or AI) and Tolerable Upper Intake Levels (ULs) come from the
 * NIH Office of Dietary Supplements (ODS) Health Professional fact sheets.
 * ODS has no fact sheets for sodium and chloride, so those use NIH's
 * MedlinePlus, which quotes the same National Academies reference values.
 * Values cover ages 14+ and change with age and sex. Pregnancy and
 * breastfeeding change many of them and are not modelled here.
 * Amounts are tracked in each nutrient's display unit (mg, mcg or g).
 * Not medical advice. */
import type { Sex } from '@/utils/calories';

/** 'other' covers tracked nutrients that are neither a vitamin nor a mineral
 * (omega-3 is a fatty acid, tryptophan an amino acid). They feed the wellness
 * categories but are deliberately excluded from the Vitamins/Minerals lists
 * and their completeness rings. */
export type MicroGroup = 'vitamin' | 'mineral' | 'other';
export type CategoryKey = 'brain' | 'muscle' | 'skin' | 'sleep' | 'energy' | 'bone' | 'immune' | 'hormones';

/** RDA = Recommended Dietary Allowance (enough for 97–98% of healthy people).
 * AI = Adequate Intake (used when there isn't enough evidence for an RDA).
 * none = NIH publishes no daily target, so the nutrient is shown but never
 * counted toward a percentage. */
export type TargetBasis = 'RDA' | 'AI' | 'none';

/** What a UL applies to:
 * - total: everything you eat and take
 * - supplemental: supplements (and, for folate/niacin, fortified foods) only
 * - preformed: vitamin A from retinol only, not beta-carotene
 * - cdrr: sodium's "reduce intake above" level, which replaced its UL in 2019 */
export type UlScope = 'total' | 'supplemental' | 'preformed' | 'cdrr';

/** A value that applies from `from` years old until the next band starts. */
export interface AgeBand { from: number; male: number; female: number }

export interface NutrientSource { name: string; url: string }

export interface MicroDef {
  key: string;
  label: string;
  unit: 'mg' | 'mcg' | 'g';
  group: MicroGroup;
  cats: CategoryKey[];
  basis: TargetBasis;
  /** Target bands, ascending by age. Empty when basis is 'none'. */
  target: AgeBand[];
  ul?: { bands: AgeBand[]; scope: UlScope; note: string };
  /** Plain-language summary, paraphrased from the source below. */
  about: string;
  /** Where the numbers and summary come from; absent when NIH has no reference value. */
  source?: NutrientSource;
  /** Extra caveat shown under the target (e.g. unit basis). */
  targetNote?: string;
}

/** Who a target is for. Unknown age falls back to a 30-year-old adult; unknown
 * or 'other' sex takes the higher target of the two so nobody is under-served. */
export interface NutrientProfile { sex?: Sex | string | null; age?: number | null }

const band = (from: number, male: number, female: number = male): AgeBand => ({ from, male, female });

const ods = (page: string, name: string): NutrientSource => ({
  name: `NIH Office of Dietary Supplements — ${name} Fact Sheet`,
  url: `https://ods.od.nih.gov/factsheets/${page}-HealthProfessional/`,
});

const SUPPLEMENT_ONLY = 'Applies to supplements and fortified foods only, not to the amount found naturally in food.';

/** All tracked micronutrients. */
export const MICROS: MicroDef[] = [
  // ── Vitamins ──
  {
    key: 'b1', label: 'B1 (Thiamine)', unit: 'mg', group: 'vitamin', cats: ['energy'],
    basis: 'RDA', target: [band(14, 1.2, 1.0), band(19, 1.2, 1.1)],
    about: 'A water-soluble B vitamin that your body uses to turn food into energy. It also supports the growth and normal function of cells.',
    source: ods('Thiamin', 'Thiamin'),
  },
  {
    key: 'b2', label: 'B2 (Riboflavin)', unit: 'mg', group: 'vitamin', cats: ['energy'],
    basis: 'RDA', target: [band(14, 1.3, 1.0), band(19, 1.3, 1.1)],
    about: 'A water-soluble B vitamin that forms two coenzymes (FMN and FAD) your cells need for energy production, cell growth and breaking down fats and medicines.',
    source: ods('Riboflavin', 'Riboflavin'),
  },
  {
    key: 'b3', label: 'B3 (Niacin)', unit: 'mg', group: 'vitamin', cats: ['energy'],
    basis: 'RDA', target: [band(14, 16, 14)],
    targetNote: 'Measured as niacin equivalents (NE); the body also makes some niacin from tryptophan.',
    ul: { bands: [band(14, 30), band(19, 35)], scope: 'supplemental', note: SUPPLEMENT_ONLY },
    about: 'A water-soluble B vitamin (nicotinic acid, nicotinamide and related forms) that the body converts into NAD, a coenzyme used by hundreds of enzymes in energy metabolism.',
    source: ods('Niacin', 'Niacin'),
  },
  {
    key: 'b5', label: 'B5 (Pantothenic Acid)', unit: 'mg', group: 'vitamin', cats: [],
    basis: 'AI', target: [band(14, 5)],
    about: 'A water-soluble B vitamin whose main job is making coenzyme A, which your body needs to build and burn fats and to produce energy.',
    source: ods('PantothenicAcid', 'Pantothenic Acid'),
  },
  {
    key: 'b6', label: 'B6 (Pyridoxine)', unit: 'mg', group: 'vitamin', cats: ['brain', 'sleep'],
    basis: 'RDA', target: [band(14, 1.3, 1.2), band(19, 1.3, 1.3), band(51, 1.7, 1.5)],
    ul: { bands: [band(14, 80), band(19, 100)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'A water-soluble vitamin used by more than 100 enzymes, mostly in protein metabolism. It also helps make neurotransmitters and supports immune function.',
    source: ods('VitaminB6', 'Vitamin B6'),
  },
  {
    key: 'b7', label: 'B7 (Biotin)', unit: 'mcg', group: 'vitamin', cats: [],
    basis: 'AI', target: [band(14, 25), band(19, 30)],
    about: 'A water-soluble B vitamin that five enzymes depend on to process fats, carbohydrates and amino acids.',
    source: ods('Biotin', 'Biotin'),
  },
  {
    key: 'folate', label: 'B9 (Folate)', unit: 'mcg', group: 'vitamin', cats: ['brain', 'energy'],
    basis: 'RDA', target: [band(14, 400)],
    targetNote: 'Measured as dietary folate equivalents (DFE).',
    ul: {
      bands: [band(14, 800), band(19, 1000)], scope: 'supplemental',
      note: 'Applies to folic acid from supplements and fortified foods only, not to folate found naturally in food.',
    },
    about: 'A water-soluble B vitamin (folic acid is its synthetic form) needed to make DNA and RNA and to process amino acids. It is especially important for cell division.',
    source: ods('Folate', 'Folate'),
  },
  {
    key: 'b12', label: 'B12 (Cobalamin)', unit: 'mcg', group: 'vitamin', cats: ['brain', 'muscle', 'energy', 'immune', 'hormones'],
    basis: 'RDA', target: [band(14, 2.4)],
    about: 'A water-soluble vitamin containing cobalt. It is needed for healthy red blood cells, nerve function and DNA synthesis, and is found mainly in animal foods.',
    source: ods('VitaminB12', 'Vitamin B12'),
  },
  {
    key: 'choline', label: 'Choline', unit: 'mg', group: 'vitamin', cats: ['brain'],
    basis: 'AI', target: [band(14, 550, 400), band(19, 550, 425)],
    ul: { bands: [band(14, 3000), band(19, 3500)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'An essential nutrient used to build the fats that make up cell membranes and to make acetylcholine, a messenger for memory, mood and muscle control.',
    source: ods('Choline', 'Choline'),
  },
  {
    key: 'omega3', label: 'Omega-3', unit: 'g', group: 'other', cats: ['brain', 'skin', 'immune'],
    basis: 'AI', target: [band(14, 1.6, 1.1)],
    targetNote: 'The NIH target is for ALA, the plant omega-3. There is no separate target for EPA and DHA.',
    about: 'A family of polyunsaturated fats (ALA, EPA and DHA) that form part of every cell membrane and help make signalling molecules that affect the heart, blood vessels, lungs and immune system.',
    source: ods('Omega3FattyAcids', 'Omega-3 Fatty Acids'),
  },
  {
    key: 'vitaminA', label: 'Vitamin A', unit: 'mcg', group: 'vitamin', cats: ['skin', 'immune', 'hormones'],
    basis: 'RDA', target: [band(14, 900, 700)],
    targetNote: 'Measured as retinol activity equivalents (RAE).',
    ul: {
      bands: [band(14, 2800), band(19, 3000)], scope: 'preformed',
      note: 'Applies to preformed vitamin A (retinol from animal foods, fortified foods and supplements), not to beta-carotene.',
    },
    about: 'A group of fat-soluble compounds that support vision, immune function, reproduction and cell growth, and help the heart, lungs and other organs work normally.',
    source: ods('VitaminA', 'Vitamin A'),
  },
  {
    key: 'vitaminC', label: 'Vitamin C (Ascorbic Acid)', unit: 'mg', group: 'vitamin', cats: ['skin', 'immune'],
    basis: 'RDA', target: [band(14, 75, 65), band(19, 90, 75)],
    targetNote: 'NIH adds 35 mg a day for people who smoke.',
    ul: { bands: [band(14, 1800), band(19, 2000)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'A water-soluble antioxidant that people must get from food because the body cannot make it. It is needed to make collagen and helps the immune system and iron absorption.',
    source: ods('VitaminC', 'Vitamin C'),
  },
  {
    key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', group: 'vitamin', cats: ['brain', 'muscle', 'sleep', 'bone', 'immune', 'hormones'],
    basis: 'RDA', target: [band(14, 15), band(71, 20)],
    targetNote: '1 mcg = 40 IU.',
    ul: { bands: [band(14, 100)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'A fat-soluble vitamin found in few foods that your skin also makes in sunlight. It helps you absorb calcium for strong bones and supports muscles, nerves and immunity.',
    source: ods('VitaminD', 'Vitamin D'),
  },
  {
    key: 'vitaminE', label: 'Vitamin E', unit: 'mg', group: 'vitamin', cats: ['skin'],
    basis: 'RDA', target: [band(14, 15)],
    targetNote: 'Measured as alpha-tocopherol.',
    ul: {
      bands: [band(14, 800), band(19, 1000)], scope: 'supplemental',
      note: 'Applies to alpha-tocopherol from supplements only, not to vitamin E found naturally in food.',
    },
    about: 'A group of fat-soluble antioxidants that protect cells from damage by free radicals and support immune function.',
    source: ods('VitaminE', 'Vitamin E'),
  },
  {
    key: 'vitaminK', label: 'Vitamin K', unit: 'mcg', group: 'vitamin', cats: ['bone'],
    basis: 'AI', target: [band(14, 75), band(19, 120, 90)],
    about: 'A family of fat-soluble compounds (K1 and K2) that the body needs to make proteins for blood clotting and bone building.',
    source: ods('VitaminK', 'Vitamin K'),
  },

  // ── Minerals ──
  {
    key: 'calcium', label: 'Calcium', unit: 'mg', group: 'mineral', cats: ['sleep', 'muscle', 'bone'],
    basis: 'RDA', target: [band(14, 1300), band(19, 1000), band(51, 1000, 1200), band(71, 1200)],
    ul: { bands: [band(14, 3000), band(19, 2500), band(51, 2000)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'The most abundant mineral in the body. Most of it builds bones and teeth; the rest helps muscles move, nerves carry messages, blood vessels contract and relax, and hormones be released.',
    source: ods('Calcium', 'Calcium'),
  },
  {
    key: 'copper', label: 'Copper', unit: 'mcg', group: 'mineral', cats: ['skin', 'energy', 'immune'],
    basis: 'RDA', target: [band(14, 890), band(19, 900)],
    ul: { bands: [band(14, 8000), band(19, 10000)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'An essential mineral that enzymes use for energy production, iron metabolism, building connective tissue and making brain chemicals.',
    source: ods('Copper', 'Copper'),
  },
  {
    key: 'iron', label: 'Iron', unit: 'mg', group: 'mineral', cats: ['brain', 'skin', 'muscle', 'energy', 'hormones'],
    basis: 'RDA', target: [band(14, 11, 15), band(19, 8, 18), band(51, 8, 8)],
    targetNote: 'NIH advises vegetarians to aim for 1.8× this amount because plant iron is absorbed less well.',
    ul: { bands: [band(14, 45)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'A mineral needed to make hemoglobin, the protein in red blood cells that carries oxygen from your lungs to your muscles and organs, and myoglobin, which stores oxygen in muscle.',
    source: ods('Iron', 'Iron'),
  },
  {
    key: 'magnesium', label: 'Magnesium', unit: 'mg', group: 'mineral', cats: ['brain', 'muscle', 'sleep', 'energy', 'bone', 'hormones'],
    basis: 'RDA', target: [band(14, 410, 360), band(19, 400, 310), band(31, 420, 320)],
    ul: {
      bands: [band(14, 350)], scope: 'supplemental',
      note: 'Applies to supplements and medicines only, not to magnesium found naturally in food.',
    },
    about: 'A cofactor for more than 300 enzyme systems, including those for energy production, protein synthesis, muscle and nerve function, blood sugar and blood pressure control.',
    source: ods('Magnesium', 'Magnesium'),
  },
  {
    key: 'manganese', label: 'Manganese', unit: 'mg', group: 'mineral', cats: ['bone'],
    basis: 'AI', target: [band(14, 2.2, 1.6), band(19, 2.3, 1.8)],
    ul: { bands: [band(14, 9), band(19, 11)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'A trace mineral used by enzymes involved in metabolism, bone formation and protection against oxidative damage.',
    source: ods('Manganese', 'Manganese'),
  },
  {
    key: 'phosphorus', label: 'Phosphorus', unit: 'mg', group: 'mineral', cats: ['bone'],
    basis: 'RDA', target: [band(14, 1250), band(19, 700)],
    ul: { bands: [band(14, 4000), band(71, 3000)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'An essential mineral found in bones, teeth, DNA and RNA. It also forms part of ATP, the molecule your cells use to store and spend energy.',
    source: ods('Phosphorus', 'Phosphorus'),
  },
  {
    key: 'potassium', label: 'Potassium', unit: 'mg', group: 'mineral', cats: ['muscle', 'sleep', 'energy', 'bone'],
    basis: 'AI', target: [band(14, 3000, 2300), band(19, 3400, 2600)],
    about: 'The main mineral inside your cells. It keeps fluid balance normal and is needed for nerve signals and muscle contraction, including your heartbeat.',
    source: ods('Potassium', 'Potassium'),
  },
  {
    key: 'selenium', label: 'Selenium', unit: 'mcg', group: 'mineral', cats: ['skin', 'hormones'],
    basis: 'RDA', target: [band(14, 55)],
    ul: { bands: [band(14, 400)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'A trace mineral built into about 25 proteins that protect cells from oxidative damage and help make thyroid hormones and DNA.',
    source: ods('Selenium', 'Selenium'),
  },
  {
    key: 'sodium', label: 'Sodium', unit: 'mg', group: 'mineral', cats: ['muscle', 'sleep', 'energy'],
    basis: 'AI', target: [band(14, 1500)],
    ul: {
      bands: [band(14, 2300)], scope: 'cdrr',
      note: 'Reducing intake when you are above 2,300 mg a day lowers the risk of high blood pressure and heart disease.',
    },
    about: 'An electrolyte that controls blood pressure and fluid volume and is needed for nerves and muscles to work. Most people get far more than they need from salt.',
    source: { name: 'NIH MedlinePlus — Sodium in diet', url: 'https://medlineplus.gov/ency/article/002415.htm' },
  },
  {
    key: 'zinc', label: 'Zinc', unit: 'mg', group: 'mineral', cats: ['brain', 'skin', 'muscle', 'immune', 'hormones'],
    basis: 'RDA', target: [band(14, 11, 9), band(19, 11, 8)],
    ul: { bands: [band(14, 34), band(19, 40)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'An essential mineral needed by about 100 enzymes. It supports immune function, protein and DNA synthesis, wound healing, growth, and taste and smell.',
    source: ods('Zinc', 'Zinc'),
  },
  {
    key: 'iodine', label: 'Iodine', unit: 'mcg', group: 'mineral', cats: [],
    basis: 'RDA', target: [band(14, 150)],
    ul: { bands: [band(14, 900), band(19, 1100)], scope: 'total', note: 'Applies to food and supplements combined.' },
    about: 'A trace mineral your thyroid needs to make the hormones T4 and T3, which control metabolism and are essential for growth and development.',
    source: ods('Iodine', 'Iodine'),
  },
  {
    key: 'fluoride', label: 'Fluoride', unit: 'mg', group: 'mineral', cats: [],
    basis: 'AI', target: [band(14, 3), band(19, 4, 3)],
    ul: { bands: [band(14, 10)], scope: 'total', note: 'Applies to food, water and supplements combined.' },
    about: 'The ionic form of fluorine. It helps prevent and reverse early tooth decay and stimulates new bone formation.',
    source: ods('Fluoride', 'Fluoride'),
  },
  {
    key: 'sulfur', label: 'Sulfur', unit: 'mg', group: 'mineral', cats: [],
    basis: 'none', target: [],
    about: 'Sulfur is part of the amino acids methionine and cysteine, so it arrives with the protein you eat. NIH publishes no daily target for it, so it is not counted in your percentages.',
  },
  {
    key: 'chloride', label: 'Chloride', unit: 'mg', group: 'mineral', cats: [],
    basis: 'AI', target: [band(14, 2300), band(51, 2000), band(71, 1800)],
    about: 'An electrolyte that works with sodium and potassium to balance body fluids, and is part of stomach acid. Most comes from table salt.',
    source: { name: 'NIH MedlinePlus — Chloride in diet', url: 'https://medlineplus.gov/ency/article/002417.htm' },
  },
  {
    key: 'tryptophan', label: 'Tryptophan', unit: 'g', group: 'other', cats: ['sleep'],
    basis: 'none', target: [],
    about: 'An essential amino acid that the body uses to build protein and can convert into niacin. NIH publishes no separate daily target for it, so it is not counted in your percentages.',
  },
];

/** A row on a wellness-category screen. The design mixes micronutrients with
 * macro rows (calories, protein, fat), which are read from the user's targets
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
/** Stored alongside the micros for supplements, so upper limits that only
 * cover one form can be checked: preformed vitamin A (mcg RAE from retinol)
 * and folic acid (mcg, the form the folate UL covers). */
export const LIMIT_FORM_KEYS = ['vitaminAPreformed', 'folicAcid'] as const;
const STORED_KEYS = [...MICRO_KEYS, ...LIMIT_FORM_KEYS];
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

/** Adult default when the profile has no usable age. */
const DEFAULT_AGE = 30;

function bandFor(bands: AgeBand[], age: number | null | undefined): AgeBand | null {
  if (bands.length === 0) return null;
  const a = age && age > 0 ? age : DEFAULT_AGE;
  let hit = bands[0]; // Under-14s get the youngest published band.
  for (const b of bands) if (a >= b.from) hit = b;
  return hit;
}

function valueFor(b: AgeBand, sex: NutrientProfile['sex'], prefer: 'higher' | 'lower'): number {
  if (sex === 'male') return b.male;
  if (sex === 'female') return b.female;
  return prefer === 'higher' ? Math.max(b.male, b.female) : Math.min(b.male, b.female);
}

/** Daily target (RDA or AI) for this person, or null when NIH sets none. */
export function targetFor(key: string, profile?: NutrientProfile | null): number | null {
  const def = MICRO_BY_KEY[key];
  if (!def || def.basis === 'none') return null;
  const b = bandFor(def.target, profile?.age);
  return b ? valueFor(b, profile?.sex, 'higher') : null;
}

export interface UpperLimit { value: number; scope: UlScope; note: string }

/** Tolerable Upper Intake Level for this person, or null when NIH sets none.
 * For unknown sex the lower of the two limits is used (none differ today). */
export function upperLimitFor(key: string, profile?: NutrientProfile | null): UpperLimit | null {
  const ul = MICRO_BY_KEY[key]?.ul;
  if (!ul) return null;
  const b = bandFor(ul.bands, profile?.age);
  return b ? { value: valueFor(b, profile?.sex, 'lower'), scope: ul.scope, note: ul.note } : null;
}

/** Plain label for the kind of target, for the detail sheet. */
export function basisLabel(basis: TargetBasis): string {
  return basis === 'RDA' ? 'Recommended Dietary Allowance (RDA)'
    : basis === 'AI' ? 'Adequate Intake (AI)'
    : 'No NIH daily target';
}

/** Short age/sex description of which band a target came from. */
export function profileLabel(profile?: NutrientProfile | null): string {
  const sex = profile?.sex === 'male' ? 'men' : profile?.sex === 'female' ? 'women' : 'adults';
  const age = profile?.age && profile.age > 0 ? profile.age : null;
  return age ? `${sex}, age ${age}` : `${sex} (set your age in Profile for a precise target)`;
}

/** % of target for one nutrient; 0 when there is no target. */
export function percentOf(key: string, amount: number, profile?: NutrientProfile | null): number {
  const target = targetFor(key, profile);
  if (!target || target <= 0) return 0;
  return (amount / target) * 100;
}

/** Average % across nutrients with a target, each capped at 100. */
function averagePercent(defs: MicroDef[], totals: Record<string, number>, profile?: NutrientProfile | null): number {
  const scored = defs.filter(d => targetFor(d.key, profile) != null);
  if (scored.length === 0) return 0;
  const sum = scored.reduce((acc, d) => acc + Math.min(100, percentOf(d.key, totals[d.key] || 0, profile)), 0);
  return Math.round(sum / scored.length);
}

/** Average % across a nutrient group (vitamins or minerals). */
export function groupPercent(totals: Record<string, number>, group: MicroGroup, profile?: NutrientProfile | null): number {
  return averagePercent(MICROS.filter(m => m.group === group), totals, profile);
}

/** Average % across the nutrients that drive a wellness category. */
export function categoryPercent(totals: Record<string, number>, cat: CategoryKey, profile?: NutrientProfile | null): number {
  return averagePercent(MICROS.filter(m => m.cats.includes(cat)), totals, profile);
}

/** The amount that counts toward a UL. Supplement-only limits look at what
 * came from supplements; preformed vitamin A does the same, because the logged
 * food data can't separate retinol from beta-carotene. */
export function amountTowardLimit(key: string, total: number, fromSupplements: number, profile?: NutrientProfile | null): number {
  const ul = upperLimitFor(key, profile);
  if (!ul) return 0;
  return ul.scope === 'supplemental' || ul.scope === 'preformed' ? fromSupplements : total;
}

/** True when the day's intake is above the UL (or sodium's reduce-above level). */
export function isOverLimit(key: string, total: number, fromSupplements: number, profile?: NutrientProfile | null): boolean {
  const ul = upperLimitFor(key, profile);
  if (!ul) return false;
  return amountTowardLimit(key, total, fromSupplements, profile) > ul.value;
}

/** Parse a stored micros JSON blob into a number map (empty on bad input).
 * Zeros are kept: a stored 0 means the source reported none, while a missing
 * key means the source didn't report that nutrient at all. */
export function parseMicros(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      const out: Record<string, number> = {};
      for (const k of STORED_KEYS) {
        if (obj[k] == null) continue;
        const v = Number(obj[k]);
        if (isFinite(v) && v >= 0) out[k] = v;
      }
      return out;
    }
  } catch {
    // Malformed — treat as no micro data.
  }
  return {};
}

/** Format a nutrient amount for display: whole numbers from 10, one decimal
 * from 0.1, two below that so trace amounts don't read as "0". */
export function formatAmount(v: number): string {
  if (v >= 10) return String(Math.round(v));
  if (v >= 0.1 || v === 0) return String(Math.round(v * 10) / 10);
  return String(Math.round(v * 100) / 100);
}
