import { create } from 'zustand';
import type { Food, FoodLog, MealType, SavedMeal } from '@/types';
import { getDatabase } from '@/database/schema';

interface NutritionState {
  todayLogs: FoodLog[];
  favorites: Food[];
  recents: Food[];
  savedMeals: SavedMeal[];
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFat: number;

  loadTodayLogs: (date?: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
  loadRecents: () => Promise<void>;
  loadSavedMeals: () => Promise<void>;
  logFood: (foodId: number, mealType: MealType, servings: number, date?: string) => Promise<void>;
  deleteLog: (logId: number) => Promise<void>;
  addCustomFood: (food: Omit<Food, 'id' | 'createdAt' | 'isCustom'>) => Promise<number>;
  toggleFavorite: (foodId: number) => Promise<void>;
  searchFoods: (query: string) => Promise<Food[]>;
  saveMealFromDay: (name: string, date?: string) => Promise<void>;
  logSavedMeal: (savedMealId: number, mealType: MealType, date?: string) => Promise<void>;
  deleteSavedMeal: (id: number) => Promise<void>;
  copyYesterday: (date?: string) => Promise<number>;
  getDailyTotals: (days: number) => Promise<{ date: string; calories: number }[]>;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterday(date?: string): string {
  const d = date ? new Date(date) : new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  todayLogs: [],
  favorites: [],
  recents: [],
  savedMeals: [],
  todayCalories: 0,
  todayProtein: 0,
  todayCarbs: 0,
  todayFat: 0,

  loadTodayLogs: async (date?: string) => {
    const db = await getDatabase();
    const targetDate = date || getToday();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT fl.*, f.name, f.calories, f.protein, f.carbs, f.fat, f.serving_size, f.serving_unit, f.brand
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
        fiber: null, sugar: null, sodium: null,
        servingSize: r.serving_size as number,
        servingUnit: r.serving_unit as string,
        isCustom: false, isFavorite: false,
        createdAt: '',
      },
    }));

    let cal = 0, pro = 0, car = 0, fa = 0;
    for (const log of logs) {
      if (log.food) {
        cal += log.food.calories * log.servings;
        pro += log.food.protein * log.servings;
        car += log.food.carbs * log.servings;
        fa += log.food.fat * log.servings;
      }
    }

    set({
      todayLogs: logs,
      todayCalories: Math.round(cal),
      todayProtein: Math.round(pro),
      todayCarbs: Math.round(car),
      todayFat: Math.round(fa),
    });
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
      [foodId, mealType, servings, date || getToday()]
    );
    await get().loadTodayLogs(date);
  },

  deleteLog: async (logId) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM food_logs WHERE id = ?', [logId]);
    await get().loadTodayLogs();
  },

  addCustomFood: async (food) => {
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO foods (name, brand, barcode, calories, protein, carbs, fat, fiber, sugar, sodium, serving_size, serving_unit, is_custom, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [food.name, food.brand, food.barcode, food.calories, food.protein, food.carbs, food.fat,
       food.fiber, food.sugar, food.sodium, food.servingSize, food.servingUnit, food.isFavorite ? 1 : 0]
    );
    return result.lastInsertRowId;
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
    const targetDate = date || getToday();
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
    const targetDate = date || getToday();
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
    const targetDate = date || getToday();
    const yesterday = getYesterday(date);
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
    const start = new Date();
    start.setDate(start.getDate() - days);
    const rows = await db.getAllAsync<{ date: string; calories: number }>(
      `SELECT fl.log_date as date, COALESCE(SUM(f.calories * fl.servings), 0) as calories
       FROM food_logs fl JOIN foods f ON fl.food_id = f.id
       WHERE fl.log_date >= ?
       GROUP BY fl.log_date ORDER BY fl.log_date ASC`,
      [start.toISOString().split('T')[0]]
    );
    return rows.map(r => ({ date: r.date, calories: Math.round(r.calories) }));
  },
}));

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
    isCustom: (r.is_custom as number) === 1,
    isFavorite: (r.is_favorite as number) === 1,
    createdAt: r.created_at as string,
  };
}
