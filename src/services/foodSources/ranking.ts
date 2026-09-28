/** How well a food's name matches a search. Shared by the search ranking
 * and by the micronutrient estimator's choice of a similar generic food. */
import type { Food } from '@/types';

/** Lowercase words only, with Canadian spellings folded to US ones so CNF
 * names ("Yogourt, Greek style") match searches ("greek yogurt"). */
export const norm = (s: string | null | undefined) => (s || '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').replace(/\byogourt/g, 'yogurt').trim();
export const microCount = (f: Food) => Object.keys(f.micros || {}).length;

/** Words that describe how a food is prepared or served rather than what it
 * is — "Fish, salmon, raw" is as good a match for "salmon" as "Salmon". */
const NEUTRAL_WORDS = new Set([
  'raw', 'cooked', 'fresh', 'plain', 'whole', 'baked', 'grilled', 'boiled', 'roasted', 'steamed',
  'broiled', 'poached', 'nfs', 'ns', 'as', 'to', 'eaten', 'with', 'without', 'and', 'or', 'of', 'in',
  'the', 'a', 'skin', 'flesh', 'meat', 'only', 'edible', 'portion', 'unprepared', 'prepared',
  'drained', 'solids', 'canned', 'frozen', 'dry', 'dried', 'unsalted', 'salted',
  'commercial', 'commercially', 'ready', 'eat', 'type', 'candies', 'cereal', 'cereals',
]);

const hasWord = (words: string[], t: string) =>
  words.includes(t) || words.includes(`${t}s`) || words.includes(`${t}es`) || words.includes(t.replace(/e?s$/, ''));

export interface NameMatch {
  /** Higher is better. */
  score: number;
  /** Every query word was found as a whole word. */
  allMatched: boolean;
  /** The last query word — usually the head noun ("dark chocolate" → chocolate) — was found. */
  headMatched: boolean;
}

/** Whole-word matches first, then fewer unrelated words, so plain foods
 * beat dishes that merely contain them. */
export function nameMatch(f: Food, query: string, tokens: string[]): NameMatch {
  const name = norm(f.name);
  const nameWords = name.split(' ');
  const allWords = nameWords.concat(norm(f.brand).split(' ').filter(Boolean));
  let matched = 0;
  let whole = 0;
  for (const t of tokens) {
    if (hasWord(allWords, t)) { matched += 1; whole += 1; }
    else if (allWords.some(w => w.startsWith(t))) matched += 0.4; // "salmon" in "salmonberry"
  }
  let s = (40 * matched) / Math.max(1, tokens.length);
  if (matched < tokens.length) s -= 20;
  if (name === query) s += 25;

  // Unrelated words in the name. USDA/CNF names lead with a category
  // ("Fish, salmon, raw"), which isn't counted against the food.
  const segments = f.name.split(',').map(norm);
  const category = segments.length > 1 && !tokens.some(t => segments[0].includes(t)) ? new Set(segments[0].split(' ')) : null;
  const extra = nameWords.filter(w => w && !tokens.some(t => w.startsWith(t) || t.startsWith(w))
    && !NEUTRAL_WORDS.has(w) && !category?.has(w)).length;
  s -= Math.min(30, extra * 6);

  const head = tokens[tokens.length - 1];
  return { score: s, allMatched: whole === tokens.length, headMatched: !!head && hasWord(allWords, head) };
}
