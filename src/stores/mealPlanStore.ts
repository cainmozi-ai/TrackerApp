import { create } from 'zustand';
import { getDatabase } from '@/database/schema';

export interface PlannedMeal {
  id: number;
  foodId: number;
  mealType: string;
  planDate: string;
  servings: number;
  foodName: string;
}

export interface ShoppingItem {
  id: number;
  itemName: string;
  category: string | null;
  quantity: string | null;
  isChecked: boolean;
}

interface MealPlanState {
  plans: PlannedMeal[];
  shoppingList: ShoppingItem[];
  loadWeek: (weekStart: string) => Promise<void>;
  addToPlan: (foodId: number, mealType: string, planDate: string, servings: number) => Promise<void>;
  removeFromPlan: (id: number) => Promise<void>;
  generateShoppingList: (weekStart: string) => Promise<void>;
  loadShoppingList: (weekStart: string) => Promise<void>;
  toggleShoppingItem: (id: number) => Promise<void>;
  clearShoppingList: (weekStart: string) => Promise<void>;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday as week start
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  plans: [],
  shoppingList: [],

  loadWeek: async (weekStart) => {
    const db = await getDatabase();
    const weekEnd = addDays(weekStart, 6);
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT mp.*, f.name as food_name FROM meal_plans mp
       JOIN foods f ON mp.food_id = f.id
       WHERE mp.plan_date BETWEEN ? AND ? ORDER BY mp.plan_date`,
      [weekStart, weekEnd]
    );
    set({
      plans: rows.map(r => ({
        id: r.id as number,
        foodId: r.food_id as number,
        mealType: r.meal_type as string,
        planDate: r.plan_date as string,
        servings: r.servings as number,
        foodName: r.food_name as string,
      })),
    });
  },

  addToPlan: async (foodId, mealType, planDate, servings) => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO meal_plans (food_id, meal_type, plan_date, servings) VALUES (?, ?, ?, ?)',
      [foodId, mealType, planDate, servings]
    );
    await get().loadWeek(getWeekStart(new Date(planDate)));
  },

  removeFromPlan: async (id) => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ plan_date: string }>('SELECT plan_date FROM meal_plans WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM meal_plans WHERE id = ?', [id]);
    if (row) await get().loadWeek(getWeekStart(new Date(row.plan_date)));
  },

  generateShoppingList: async (weekStart) => {
    const db = await getDatabase();
    const weekEnd = addDays(weekStart, 6);
    await db.runAsync('DELETE FROM shopping_list WHERE week_start = ?', [weekStart]);
    const items = await db.getAllAsync<{ name: string; total: number }>(
      `SELECT f.name as name, SUM(mp.servings) as total FROM meal_plans mp
       JOIN foods f ON mp.food_id = f.id
       WHERE mp.plan_date BETWEEN ? AND ? GROUP BY f.name`,
      [weekStart, weekEnd]
    );
    for (const item of items) {
      await db.runAsync(
        'INSERT INTO shopping_list (item_name, category, quantity, is_checked, week_start) VALUES (?, ?, ?, 0, ?)',
        [item.name, 'Groceries', `${item.total} serving${item.total > 1 ? 's' : ''}`, weekStart]
      );
    }
    await get().loadShoppingList(weekStart);
  },

  loadShoppingList: async (weekStart) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM shopping_list WHERE week_start = ? ORDER BY is_checked, item_name',
      [weekStart]
    );
    set({
      shoppingList: rows.map(r => ({
        id: r.id as number,
        itemName: r.item_name as string,
        category: r.category as string | null,
        quantity: r.quantity as string | null,
        isChecked: (r.is_checked as number) === 1,
      })),
    });
  },

  toggleShoppingItem: async (id) => {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE shopping_list SET is_checked = CASE WHEN is_checked = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [id]
    );
    const row = await db.getFirstAsync<{ week_start: string }>('SELECT week_start FROM shopping_list WHERE id = ?', [id]);
    if (row) await get().loadShoppingList(row.week_start);
  },

  clearShoppingList: async (weekStart) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM shopping_list WHERE week_start = ?', [weekStart]);
    await get().loadShoppingList(weekStart);
  },
}));
