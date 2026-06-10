import { create } from 'zustand';
import type { WeightLog } from '@/types';
import { getDatabase } from '@/database/schema';

export interface TrendPoint {
  date: string;
  scale: number;
  trend: number;
}

interface WeightState {
  recent: WeightLog[];
  logWeight: (weight: number, date?: string) => Promise<void>;
  loadRecent: (days?: number) => Promise<void>;
  deleteLog: (id: number) => Promise<void>;
  getTrendSeries: (days?: number) => Promise<TrendPoint[]>;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// EMA smoothing factor — lower = smoother (cuts daily noise, MacroFactor-style).
const ALPHA = 0.25;

export const useWeightStore = create<WeightState>((set, get) => ({
  recent: [],

  logWeight: async (weight, date) => {
    const db = await getDatabase();
    const targetDate = date || getToday();
    // One entry per day — replace if it exists.
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM weight_logs WHERE log_date = ?',
      [targetDate]
    );
    if (existing) {
      await db.runAsync('UPDATE weight_logs SET weight = ? WHERE id = ?', [weight, existing.id]);
    } else {
      await db.runAsync('INSERT INTO weight_logs (weight, log_date) VALUES (?, ?)', [weight, targetDate]);
    }
    await get().loadRecent();
  },

  loadRecent: async (days = 60) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM weight_logs ORDER BY log_date DESC LIMIT ?',
      [days]
    );
    set({
      recent: rows.map(r => ({
        id: r.id as number,
        weight: r.weight as number,
        logDate: r.log_date as string,
        createdAt: r.created_at as string,
      })),
    });
  },

  deleteLog: async (id) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM weight_logs WHERE id = ?', [id]);
    await get().loadRecent();
  },

  getTrendSeries: async (days = 60) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ weight: number; log_date: string }>(
      'SELECT weight, log_date FROM weight_logs ORDER BY log_date ASC LIMIT ?',
      [days]
    );
    const out: TrendPoint[] = [];
    let trend = 0;
    rows.forEach((r, i) => {
      trend = i === 0 ? r.weight : ALPHA * r.weight + (1 - ALPHA) * trend;
      out.push({ date: r.log_date, scale: r.weight, trend: Math.round(trend * 10) / 10 });
    });
    return out;
  },
}));
