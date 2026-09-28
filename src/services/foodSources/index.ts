/** One search across every online food database the app uses:
 *  - USDA FoodData Central (generic foods; branded too with a personal key)
 *  - Health Canada's Canadian Nutrient File (generic foods)
 *  - Open Food Facts (packaged foods worldwide)
 *  - NIH Dietary Supplement Label Database (supplements)
 * Each source reports back as soon as it answers; results are merged,
 * de-duplicated (filling gaps in one source's nutrients from another's) and
 * ranked by how well they match. */
import type { Food, FoodSourceId } from '@/types';
import { searchOpenFoodFacts, lookupBarcode as lookupOffBarcode } from '@/services/openFoodFacts';
import { searchUsda, lookupUsdaBarcode, USDA_HAS_KEY } from './usda';
import { searchCnf } from './cnf';
import { searchDsld, lookupDsldBarcode } from './dsld';
import { SourceError } from './common';
import { nameMatch, norm, microCount } from './ranking';

export { SOURCE_META } from './common';
export { USDA_HAS_KEY } from './usda';

export type OnlineSourceId = Extract<FoodSourceId, 'usda' | 'cnf' | 'off' | 'dsld'>;
export const ONLINE_SOURCES: OnlineSourceId[] = ['usda', 'cnf', 'off', 'dsld'];

export interface SourceStatus {
  state: 'loading' | 'done' | 'error';
  count: number;
  /** Short, user-facing reason when state is 'error'. */
  message?: string;
}

const SEARCHERS: Record<OnlineSourceId, (q: string) => Promise<Food[]>> = {
  usda: searchUsda,
  cnf: searchCnf,
  off: q => searchOpenFoodFacts(q),
  dsld: searchDsld,
};

function errorMessage(source: OnlineSourceId, e: unknown): string {
  if (e instanceof SourceError) {
    if (e.kind === 'rate-limit') {
      return source === 'usda' && !USDA_HAS_KEY ? 'Hourly limit reached — add a free USDA API key' : 'Busy — try again shortly';
    }
    if (e.kind === 'timeout') return 'Took too long to answer';
    if (e.kind === 'network') return 'Couldn’t connect';
  }
  return 'Unavailable right now';
}

/** Search every source in parallel. `onUpdate` fires after each source
 * answers with the merged, ranked list so far and every source's status.
 * Resolves once all sources have answered. */
export async function searchAllSources(
  query: string,
  onUpdate: (results: Food[], status: Record<OnlineSourceId, SourceStatus>) => void,
): Promise<void> {
  const status = Object.fromEntries(
    ONLINE_SOURCES.map(s => [s, { state: 'loading', count: 0 } as SourceStatus]),
  ) as Record<OnlineSourceId, SourceStatus>;
  let pool: Food[] = [];
  onUpdate([], { ...status });

  await Promise.all(ONLINE_SOURCES.map(async source => {
    try {
      const foods = (await SEARCHERS[source](query)).filter(f => source === 'dsld' || hasNutrition(f));
      pool = pool.concat(foods);
      status[source] = { state: 'done', count: foods.length };
    } catch (e) {
      status[source] = { state: 'error', count: 0, message: errorMessage(source, e) };
    }
    onUpdate(rankFoods(dedupe(pool), query), { ...status });
  }));
}

/** Look a barcode up everywhere; the first hit (OFF, then USDA branded, then
 * NIH DSLD) is used, with any nutrients it lacks filled from the others. */
export async function lookupBarcodeAll(code: string): Promise<Food | null> {
  const [off, usda, dsld] = await Promise.all([
    lookupOffBarcode(code).catch(() => null),
    lookupUsdaBarcode(code).catch(() => null),
    lookupDsldBarcode(code).catch(() => null),
  ]);
  const hits = [off && hasNutrition(off) ? off : null, usda, dsld, off].filter((f): f is Food => !!f);
  if (!hits.length) return null;
  const [primary, ...rest] = hits;
  return rest.reduce(fillGaps, primary);
}

/** Some Open Food Facts entries have no nutrition at all — hide them. */
export const hasNutrition = (f: Food) => f.calories > 0 || f.protein > 0 || f.carbs > 0 || f.fat > 0;

/** Copy nutrients `extra` reports that `base` doesn't. Serving sizes can
 * differ, so values are rescaled by calories when both have them, else by
 * serving weight when both are in grams; otherwise nothing is copied. */
function fillGaps(base: Food, extra: Food): Food {
  if (base === extra) return base;
  let ratio: number | null = null;
  if (base.calories > 0 && extra.calories > 0) ratio = base.calories / extra.calories;
  else if (base.servingUnit === extra.servingUnit && extra.servingSize > 0) ratio = base.servingSize / extra.servingSize;
  if (ratio == null || !isFinite(ratio)) return base;
  const micros = { ...(base.micros || {}) };
  for (const [k, v] of Object.entries(extra.micros || {})) {
    if (micros[k] == null) micros[k] = Math.round(v * ratio * 1000) / 1000;
  }
  return { ...base, micros };
}

/** Merge foods that are the same product: same barcode, or same name and
 * brand (supplement labels are often listed once per label version). */
function dedupe(foods: Food[]): Food[] {
  const kept: Food[] = [];
  const index = new Map<string, number>();
  for (const f of foods) {
    const keys = [`nm:${norm(f.name)}|${norm(f.brand)}`];
    if (f.barcode) keys.push(`bc:${f.barcode.replace(/^0+/, '')}`);
    const hit = keys.map(k => index.get(k)).find(i => i != null);
    if (hit == null) {
      keys.forEach(k => index.set(k, kept.length));
      kept.push(f);
    } else {
      const prev = kept[hit];
      kept[hit] = microCount(f) > microCount(prev) ? fillGaps(f, prev) : fillGaps(prev, f);
      keys.forEach(k => index.set(k, hit));
    }
  }
  return kept;
}

const SUPPLEMENT_WORDS = /\b(vitamin|supplement|capsule|tablet|softgel|gumm(y|ies)|multi ?vitamin|creatine|pre ?workout|bcaa|eaa|electrolyte|fish oil|omega|magnesium|zinc|iron|calcium|melatonin|ashwagandha|collagen|probiotic|b12|d3|biotin|folic|glutamine|beta ?alanine|citrulline)\b/;

/** Word matches first (see ranking.ts), then sources suited to the query,
 * then how many nutrients the entry reports. */
function score(f: Food, query: string, tokens: string[], wantsSupplement: boolean): number {
  let s = nameMatch(f, query, tokens).score;
  if (f.source === 'dsld') s += wantsSupplement ? 15 : -30;
  else if (f.source === 'usda') s += f.brand ? 2 : 10;
  else if (f.source === 'cnf') s += 8;
  s += Math.min(8, microCount(f) / 3);
  return s;
}

export function rankFoods(foods: Food[], query: string): Food[] {
  const q = norm(query);
  const tokens = q.split(' ').filter(Boolean);
  const wantsSupplement = SUPPLEMENT_WORDS.test(q);
  return foods
    .map(f => ({ f, s: score(f, q, tokens, wantsSupplement) }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.f);
}
