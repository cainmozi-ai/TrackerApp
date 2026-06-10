import { create } from 'zustand';
import type { WaterLog } from '@/types';
import { getDatabase } from '@/database/schema';

interface WaterState {
  todayLogs: WaterLog[];
  todayTotal: number;
  loadTodayLogs: (date?: string) => Promise<void>;
  addWater: (amountMl: number, date?: string) => Promise<void>;
  removeLog: (logId: number) => Promise<void>;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export const useWaterStore = create<WaterState>((set, get) => ({
  todayLogs: [],
  todayTotal: 0,

  loadTodayLogs: async (date?: string) => {
    const db = await getDatabase();
    const targetDate = date || getToday();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM water_logs WHERE log_date = ? ORDER BY created_at DESC',
      [targetDate]
    );
    const logs = rows.map(r => ({
      id: r.id as number,
      amountMl: r.amount_ml as number,
      logDate: r.log_date as string,
      logTime: r.log_time as string,
      createdAt: r.created_at as string,
    }));
    const total = logs.reduce((sum, l) => sum + l.amountMl, 0);
    set({ todayLogs: logs, todayTotal: total });
  },

  addWater: async (amountMl, date) => {
    const db = await getDatabase();
    const now = new Date();
    await db.runAsync(
      'INSERT INTO water_logs (amount_ml, log_date, log_time) VALUES (?, ?, ?)',
      [amountMl, date || getToday(), now.toTimeString().split(' ')[0]]
    );
    await get().loadTodayLogs(date);
  },

  removeLog: async (logId) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM water_logs WHERE id = ?', [logId]);
    await get().loadTodayLogs();
  },
}));
