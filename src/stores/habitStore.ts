import { create } from 'zustand';
import type { Habit, HabitLog } from '@/types';
import { getDatabase } from '@/database/schema';

interface HabitState {
  habits: Habit[];
  todayLogs: HabitLog[];
  loadHabits: () => Promise<void>;
  loadTodayLogs: (date?: string) => Promise<void>;
  addHabit: (name: string, icon?: string, frequency?: string, targetPerWeek?: number) => Promise<void>;
  toggleHabit: (habitId: number, date?: string) => Promise<void>;
  deleteHabit: (habitId: number) => Promise<void>;
  getStreak: (habitId: number) => Promise<number>;
  getHeatmapData: (habitId: number, days?: number) => Promise<Record<string, number>>;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayLogs: [],

  loadHabits: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM habits WHERE is_active = 1 ORDER BY created_at'
    );
    set({ habits: rows.map(mapHabit) });
  },

  loadTodayLogs: async (date) => {
    const db = await getDatabase();
    const targetDate = date || getToday();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM habit_logs WHERE log_date = ?',
      [targetDate]
    );
    set({
      todayLogs: rows.map(r => ({
        id: r.id as number,
        habitId: r.habit_id as number,
        logDate: r.log_date as string,
        isCompleted: (r.is_completed as number) === 1,
        createdAt: r.created_at as string,
      })),
    });
  },

  addHabit: async (name, icon, frequency, targetPerWeek) => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO habits (name, icon, frequency, target_per_week) VALUES (?, ?, ?, ?)',
      [name, icon || null, frequency || 'daily', targetPerWeek || 7]
    );
    await get().loadHabits();
  },

  toggleHabit: async (habitId, date) => {
    const db = await getDatabase();
    const targetDate = date || getToday();
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM habit_logs WHERE habit_id = ? AND log_date = ?',
      [habitId, targetDate]
    );
    if (existing) {
      await db.runAsync('DELETE FROM habit_logs WHERE id = ?', [existing.id]);
    } else {
      await db.runAsync(
        'INSERT INTO habit_logs (habit_id, log_date) VALUES (?, ?)',
        [habitId, targetDate]
      );
    }
    await get().loadTodayLogs(date);
  },

  deleteHabit: async (habitId) => {
    const db = await getDatabase();
    await db.runAsync('UPDATE habits SET is_active = 0 WHERE id = ?', [habitId]);
    await get().loadHabits();
  },

  getStreak: async (habitId) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ log_date: string }>(
      'SELECT DISTINCT log_date FROM habit_logs WHERE habit_id = ? ORDER BY log_date DESC',
      [habitId]
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < rows.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];
      if (rows[i].log_date === expectedStr) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  getHeatmapData: async (habitId, days = 90) => {
    const db = await getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const rows = await db.getAllAsync<{ log_date: string; count: number }>(
      'SELECT log_date, COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND log_date >= ? GROUP BY log_date',
      [habitId, startDate.toISOString().split('T')[0]]
    );
    const data: Record<string, number> = {};
    for (const row of rows) {
      data[row.log_date] = row.count;
    }
    return data;
  },
}));

function mapHabit(r: Record<string, unknown>): Habit {
  return {
    id: r.id as number,
    name: r.name as string,
    icon: r.icon as string | null,
    frequency: r.frequency as 'daily' | 'weekly',
    targetPerWeek: r.target_per_week as number,
    createdAt: r.created_at as string,
    isActive: (r.is_active as number) === 1,
  };
}
