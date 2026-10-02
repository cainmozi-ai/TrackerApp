import { create } from 'zustand';
import type { Food, FoodLog, MealType, SavedMeal } from '@/types';
import { getDatabase } from '@/database/schema';
import { localToday, localDaysAgo } from '@/utils/dates';
import { MICRO_KEYS, LIMIT_FORM_KEYS, parseMicros } from '@/utils/micronutrients';

interface NutritionState {
  /** The date currently shown on the nutrition screen (YYYY-MM-DD). */
  currentDate: string;
  todayLogs: FoodLog[];
  favorites: Food[];
  allFoods: Food[];
  recents: Food[];
  savedMeals: SavedMeal[];
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFat: number;
  todayFiber: number;
  todaySugar: number;
  todaySodium: number;
  /** Today's micronutrient totals keyed by micro key (mg/mcg). */
  todayMicros: Record<string, number>;
  /** The share of todayMicros that came from supplements (NIH DSLD foods),
   * for upper limits that only apply to supplements. For folate this is mcg
   * of folic acid and for vitamin A mcg of preformed (retinol) vitamin A. */
  todaySupplementMicros: Record<string, number>;
  /** How many of today's logged foods report each nutrient (0 is a report). */
  todayMicroCoverage: Record<string, number>;
  /** Number of foods logged today, the denominator for coverage. */
  todayLogCount: number;
  /** How many of today's foods have micros estimated from a similar food. */
  todayEstimatedCount: number;

  loadTodayLogs: (date?: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
  /** Every food in the library — powers the "All" tab so nothing falls out of reach. */
  loadAllFoods: () => Promise<void>;
  loadRecents: () => Promise<void>;
  loadSavedMeals: () => Promise<void>;
  logFood: (foodId: number, mealType: MealType, servings: number, date?: string) => Promise<void>;
  updateLog: (logId: number, servings: number, mealType: MealType) => Promise<void>;
  deleteLog: (logId: number) => Promise<void>;
  addCustomFood: (food: Omit<Food, 'id' | 'createdAt' | 'isCustom'>) => Promise<number>;
  /** Store micros estimated from a similar food on an existing food, then refresh today. */
  applyMicroEstimate: (foodId: number, micros: Record<string, number>, from: string) => Promise<void>;
  /** Stop (or allow) estimating vitamins/minerals for a food. */
  setNoEstimate: (foodId: number, noEstimate: boolean) => Promise<void>;
  getFood: (foodId: number) => Promise<Food | null>;
  /** Save edits to a food. Applies everywhere it's logged. */
  updateFood: (foodId: number, food: Omit<Food, 'id' | 'createdAt' | 'isCustom' | 'isFavorite'>) => Promise<void>;
  toggleFavorite: (foodId: number) => Promise<void>;
  searchFoods: (query: string) => Promise<Food[]>;
  saveMealFromDay: (name: string, date?: string) => Promise<void>;
  logSavedMeal: (savedMealId: number, mealType: MealType, date?: string) => Promise<void>;
  deleteSavedMeal: (id: number) => Promise<void>;
  copyYesterday: (date?: string) => Promise<number>;
  getDailyTotals: (days: number) => Promise<{ date: string; calories: number }[]>;
}

function getToday(): string {
  return localToday();
}

function getYesterday(date?: string): string {
  // Parse YYYY-MM-DD as local midnight (appending T00:00:00 avoids UTC parsing).
  const d = date ? new Date(`${date}T00:00:00`) : new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  currentDate: getToday(),
  todayLogs: [],
  favorites: [],
  allFoods: [],
  recents: [],
  savedMeals: [],
  todayCalories: 0,
  todayProtein: 0,
  todayCarbs: 0,
  todayFat: 0,
  todayFiber: 0,
  todaySugar: 0,
  todaySodium: 0,
  todayMicros: {},
  todaySupplementMicros: {},
  todayMicroCoverage: {},
  todayLogCount: 0,
  todayEstimatedCount: 0,

  loadTodayLogs: async (date?: string) => {
    const db = await getDatabase();
    const targetDate = date || get().currentDate;
    set({ currentDate: targetDate });
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT fl.*, f.name, f.calories, f.protein, f.carbs, f.fat, f.fiber, f.sugar, f.sodium, f.serving_size, f.serving_unit, f.brand, f.micros, f.source, f.micros_estimated_from,
         f.micros_estimated_keys, f.no_estimate, f.is_custom
       FROM food_logs fl JOIN foods f ON fl.food_id = f.id
       WHERE fl.log_date = ? ORDER BY fl.created_at`,
      [targetDate]
    );
    const logs: FoodLog[] = rows.map(r => ({
      id: r.id as number,
      foodId: r.food_id as number,
      mealType: r.meal_type as MealType,
      servings: r.servings as number,
      logDate: r.log_date as string,
      createdAt: r.created_at as string,
      food: {
        id: r.food_id as number,
        name: r.name as string,
        brand: r.brand as string | null,
        barcode: null,
        calories: r.calories as number,
        protein: r.protein as number,
        carbs: r.carbs as number,
        fat: r.fat as number,
        fiber: r.fiber as number | null,
        sugar: r.sugar as number | null,
        sodium: r.sodium as number | null,
        servingSize: r.serving_size as number,
        servingUnit: r.serving_unit as string,
        micros: parseMicros(r.micros as string | null),
        source: (r.source as Food['source']) ?? null,
        microsEstimatedFrom: (r.micros_estimated_from as string | null) ?? null,
        microsEstimatedKeys: parseKeys(r.micros_estimated_keys),
        noEstimate: (r.no_estimate as number) === 1,
        isCustom: (r.is_custom as number) === 1, isFavorite: false,
        createdAt: '',
      },
    }));

    let cal = 0, pro = 0, car = 0, fa = 0, fib = 0, sug = 0, sod = 0;
    const micros: Record<string, number> = {};
    const supplementMicros: Record<string, number> = {};
    const coverage: Record<string, number> = {};
    for (const log of logs) {
      if (log.food) {
        cal += log.food.calories * log.servings;
        pro += log.food.protein * log.servings;
        car += log.food.carbs * log.servings;
        fa += log.food.fat * log.servings;
        fib += (log.food.fiber || 0) * log.servings;
        sug += (log.food.sugar || 0) * log.servings;
        sod += (log.food.sodium || 0) * log.servings;
        const m = log.food.micros || {};
        for (const k of MICRO_KEYS) {
          const v = m[k];
          if (v == null) continue;
          coverage[k] = (coverage[k] || 0) + 1;
          if (v) micros[k] = (micros[k] || 0) + v * log.servings;
        }
        if (log.food.sodium != null && m.sodium == null) coverage.sodium = (coverage.sodium || 0) + 1;
        if (log.food.source === 'dsld') {
          for (const k of [...MICRO_KEYS, ...LIMIT_FORM_KEYS]) {
            const v = m[k];
            if (v) supplementMicros[k] = (supplementMicros[k] || 0) + v * log.servings;
          }
        }
      }
    }
    // Limits that cover one form: use the form when the label said which one,
    // otherwise assume the whole amount is that form (the cautious reading).
    for (const [key, form, factor] of [['folate', 'folicAcid', 1 / 1.7], ['vitaminA', 'vitaminAPreformed', 1]] as const) {
      if (supplementMicros[form] == null && supplementMicros[key]) supplementMicros[form] = supplementMicros[key] * factor;
    }
    // Sodium is stored as a macro column, not in the micros blob — fold it in so
    // the micronutrient tracker shows it alongside the other minerals.
    if (sod > 0) micros.sodium = (micros.sodium || 0) + sod;

    set({
      todayLogs: logs,
      todayCalories: Math.round(cal),
      todayProtein: Math.round(pro),
      todayCarbs: Math.round(car),
      todayFat: Math.round(fa),
      todayFiber: Math.round(fib),
      todaySugar: Math.round(sug),
      todaySodium: Math.round(sod),
      todayMicros: micros,
      todaySupplementMicros: supplementMicros,
      todayMicroCoverage: coverage,
      todayLogCount: logs.length,
      todayEstimatedCount: logs.filter(l => l.food?.microsEstimatedFrom).length,
    });
  },

  loadAllFoods: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM foods ORDER BY name');
    set({ allFoods: rows.map(mapFood) });
  },

  loadFavorites: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM foods WHERE is_favorite = 1 ORDER BY name'
    );
    set({ favorites: rows.map(mapFood) });
  },

  logFood: async (foodId, mealType, servings, date) => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO food_logs (food_id, meal_type, servings, log_date) VALUES (?, ?, ?, ?)',
      [foodId, mealType, servings, date || get().currentDate]
    );
    await get().loadTodayLogs(date);
  },

  updateLog: async (logId, servings, mealType) => {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE food_logs SET servings = ?, meal_type = ? WHERE id = ?',
      [servings, mealType, logId]
    );
    await get().loadTodayLogs();
  },

  deleteLog: async (logId) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM food_logs WHERE id = ?', [logId]);
    await get().loadTodayLogs();
  },

  addCustomFood: async (food) => {
    const db = await getDatabase();
    const microsJson = food.micros && Object.keys(food.micros).length > 0 ? JSON.stringify(food.micros) : null;
    const source = food.source ?? 'custom';
    // A food saved from an online database is stored once and reused, so
    // logging the same product again doesn't pile up duplicate rows.
    if (food.sourceId && source !== 'custom') {
      const existing = await db.getFirstAsync<{ id: number; micros_estimated_from: string | null; no_estimate: number | null }>(
        'SELECT id, micros_estimated_from, no_estimate FROM foods WHERE source = ? AND source_id = ?', [source, food.sourceId]
      );
      if (existing) {
        // Saved before without an estimate — keep the one made this time
        // (unless the user has turned estimates off for this food).
        if (food.microsEstimatedFrom && !existing.micros_estimated_from && existing.no_estimate !== 1) {
          await db.runAsync('UPDATE foods SET micros = ?, micros_estimated_from = ?, micros_estimated_keys = ? WHERE id = ?',
            [microsJson, food.microsEstimatedFrom, JSON.stringify(food.microsEstimatedKeys ?? []), existing.id]);
        }
        if (food.noEstimate) await db.runAsync('UPDATE foods SET no_estimate = 1 WHERE id = ?', [existing.id]);
        return existing.id;
      }
    }
    const result = await db.runAsync(
      `INSERT INTO foods (name, brand, barcode, calories, protein, carbs, fat, fiber, sugar, sodium, serving_size, serving_unit, micros, is_custom, is_favorite, source, source_id, micros_estimated_from, micros_estimated_keys, no_estimate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [food.name, food.brand, food.barcode, food.calories, food.protein, food.carbs, food.fat,
       food.fiber, food.sugar, food.sodium, food.servingSize, food.servingUnit, microsJson, food.isFavorite ? 1 : 0,
       source, food.sourceId ?? null, food.microsEstimatedFrom ?? null,
       food.microsEstimatedKeys ? JSON.stringify(food.microsEstimatedKeys) : null, food.noEstimate ? 1 : 0]
    );
    return result.lastInsertRowId;
  },

  applyMicroEstimate: async (foodId, micros, from) => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ micros: string | null }>('SELECT micros FROM foods WHERE id = ?', [foodId]);
    // Label values win over estimates.
    const label = parseMicros(row?.micros);
    const merged = { ...micros, ...label };
    const added = Object.keys(micros).filter(k => label[k] == null);
    await db.runAsync('UPDATE foods SET micros = ?, micros_estimated_from = ?, micros_estimated_keys = ? WHERE id = ?',
      [JSON.stringify(merged), from, JSON.stringify(added), foodId]);
    await get().loadTodayLogs();
  },

  setNoEstimate: async (foodId, noEstimate) => {
    const db = await getDatabase();
    await db.runAsync('UPDATE foods SET no_estimate = ? WHERE id = ?', [noEstimate ? 1 : 0, foodId]);
  },

  getFood: async (foodId) => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM foods WHERE id = ?', [foodId]);
    return row ? mapFood(row) : null;
  },

  updateFood: async (foodId, food) => {
    const db = await getDatabase();
    const hasMicros = food.micros && Object.keys(food.micros).length > 0;
    await db.runAsync(
      `UPDATE foods SET name = ?, brand = ?, calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, sugar = ?,
         sodium = ?, serving_size = ?, serving_unit = ?, micros = ?, micros_estimated_from = ?,
         micros_estimated_keys = ?, no_estimate = ? WHERE id = ?`,
      [food.name, food.brand, food.calories, food.protein, food.carbs, food.fat, food.fiber, food.sugar,
       food.sodium, food.servingSize, food.servingUnit, hasMicros ? JSON.stringify(food.micros) : null,
       food.microsEstimatedFrom ?? null,
       food.microsEstimatedKeys?.length ? JSON.stringify(food.microsEstimatedKeys) : null,
       food.noEstimate ? 1 : 0, foodId]
    );
    await Promise.all([get().loadTodayLogs(), get().loadAllFoods(), get().loadRecents()]);
  },

  toggleFavorite: async (foodId) => {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE foods SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [foodId]
    );
    await get().loadFavorites();
  },

  searchFoods: async (query) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM foods WHERE name LIKE ? ORDER BY is_favorite DESC, name LIMIT 50',
      [`%${query}%`]
    );
    return rows.map(mapFood);
  },

  loadRecents: async () => {
    const db = await getDatabase();
    // Most-recently-logged distinct foods.
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT f.*, MAX(fl.created_at) as last_logged
       FROM food_logs fl JOIN foods f ON fl.food_id = f.id
       GROUP BY f.id ORDER BY last_logged DESC LIMIT 20`
    );
    set({ recents: rows.map(mapFood) });
  },

  loadSavedMeals: async () => {
    const db = await getDatabase();
    const meals = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM saved_meals ORDER BY created_at DESC'
    );
    const result: SavedMeal[] = [];
    for (const m of meals) {
      const id = m.id as number;
      const totals = await db.getFirstAsync<{ cals: number; count: number }>(
        `SELECT COALESCE(SUM(f.calories * smi.servings), 0) as cals, COUNT(*) as count
         FROM saved_meal_items smi JOIN foods f ON smi.food_id = f.id
         WHERE smi.saved_meal_id = ?`,
        [id]
      );
      result.push({
        id,
        name: m.name as string,
        createdAt: m.created_at as string,
        totalCalories: Math.round(totals?.cals || 0),
      });
    }
    set({ savedMeals: result });
  },

  saveMealFromDay: async (name, date) => {
    const db = await getDatabase();
    const targetDate = date || get().currentDate;
    const logs = await db.getAllAsync<{ food_id: number; servings: number }>(
      'SELECT food_id, servings FROM food_logs WHERE log_date = ?',
      [targetDate]
    );
    if (logs.length === 0) return;
    const result = await db.runAsync('INSERT INTO saved_meals (name) VALUES (?)', [name]);
    const mealId = result.lastInsertRowId;
    for (const log of logs) {
      await db.runAsync(
        'INSERT INTO saved_meal_items (saved_meal_id, food_id, servings) VALUES (?, ?, ?)',
        [mealId, log.food_id, log.servings]
      );
    }
    await get().loadSavedMeals();
  },

  logSavedMeal: async (savedMealId, mealType, date) => {
    const db = await getDatabase();
    const targetDate = date || get().currentDate;
    const items = await db.getAllAsync<{ food_id: number; servings: number }>(
      'SELECT food_id, servings FROM saved_meal_items WHERE saved_meal_id = ?',
      [savedMealId]
    );
    for (const item of items) {
      await db.runAsync(
        'INSERT INTO food_logs (food_id, meal_type, servings, log_date) VALUES (?, ?, ?, ?)',
        [item.food_id, mealType, item.servings, targetDate]
      );
    }
    await get().loadTodayLogs(date);
  },

  deleteSavedMeal: async (id) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM saved_meal_items WHERE saved_meal_id = ?', [id]);
    await db.runAsync('DELETE FROM saved_meals WHERE id = ?', [id]);
    await get().loadSavedMeals();
  },

  copyYesterday: async (date) => {
    const db = await getDatabase();
    const targetDate = date || get().currentDate;
    const yesterday = getYesterday(targetDate);
    const logs = await db.getAllAsync<{ food_id: number; meal_type: string; servings: number }>(
      'SELECT food_id, meal_type, servings FROM food_logs WHERE log_date = ?',
      [yesterday]
    );
    for (const log of logs) {
      await db.runAsync(
        'INSERT INTO food_logs (food_id, meal_type, servings, log_date) VALUES (?, ?, ?, ?)',
        [log.food_id, log.meal_type, log.servings, targetDate]
      );
    }
    await get().loadTodayLogs(date);
    return logs.length;
  },

  getDailyTotals: async (days) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ date: string; calories: number }>(
      `SELECT fl.log_date as date, COALESCE(SUM(f.calories * fl.servings), 0) as calories
       FROM food_logs fl JOIN foods f ON fl.food_id = f.id
       WHERE fl.log_date >= ?
       GROUP BY fl.log_date ORDER BY fl.log_date ASC`,
      [localDaysAgo(days)]
    );
    return rows.map(r => ({ date: r.date, calories: Math.round(r.calories) }));
  },
}));

/** micros_estimated_keys is a JSON array; null for foods estimated before
 * the keys were recorded (then every micro is treated as estimated). */
function parseKeys(raw: unknown): string[] | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : null;
  } catch {
    return null;
  }
}

function mapFood(r: Record<string, unknown>): Food {
  return {
    id: r.id as number,
    name: r.name as string,
    brand: r.brand as string | null,
    barcode: r.barcode as string | null,
    calories: r.calories as number,
    protein: r.protein as number,
    carbs: r.carbs as number,
    fat: r.fat as number,
    fiber: r.fiber as number | null,
    sugar: r.sugar as number | null,
    sodium: r.sodium as number | null,
    servingSize: r.serving_size as number,
    servingUnit: r.serving_unit as string,
    micros: parseMicros(r.micros as string | null),
    source: (r.source as Food['source']) ?? null,
    sourceId: (r.source_id as string | null) ?? null,
    microsEstimatedFrom: (r.micros_estimated_from as string | null) ?? null,
    microsEstimatedKeys: parseKeys(r.micros_estimated_keys),
    noEstimate: (r.no_estimate as number) === 1,
    isCustom: (r.is_custom as number) === 1,
    isFavorite: (r.is_favorite as number) === 1,
    createdAt: r.created_at as string,
  };
}
