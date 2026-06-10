import { create } from 'zustand';
import type { SleepLog } from '@/types';
import { getDatabase } from '@/database/schema';

interface SleepState {
  recentLogs: SleepLog[];
  todayLog: SleepLog | null;
  loadRecentLogs: (days?: number) => Promise<void>;
  loadTodayLog: (date?: string) => Promise<void>;
  logSleep: (bedtime: string, wakeTime: string, quality: number, notes?: string, date?: string) => Promise<void>;
  deleteLog: (logId: number) => Promise<void>;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function calculateDuration(bedtime: string, wakeTime: string): number {
  const bed = new Date(`2000-01-01T${bedtime}`);
  let wake = new Date(`2000-01-01T${wakeTime}`);
  if (wake <= bed) wake = new Date(`2000-01-02T${wakeTime}`);
  return Math.round((wake.getTime() - bed.getTime()) / 60000);
}

export const useSleepStore = create<SleepState>((set, get) => ({
  recentLogs: [],
  todayLog: null,

  loadRecentLogs: async (days = 7) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM sleep_logs ORDER BY log_date DESC LIMIT ?`,
      [days]
    );
    set({ recentLogs: rows.map(mapSleepLog) });
  },

  loadTodayLog: async (date?: string) => {
    const db = await getDatabase();
    const targetDate = date || getToday();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM sleep_logs WHERE log_date = ?',
      [targetDate]
    );
    set({ todayLog: row ? mapSleepLog(row) : null });
  },

  logSleep: async (bedtime, wakeTime, quality, notes, date) => {
    const db = await getDatabase();
    const targetDate = date || getToday();
    const duration = calculateDuration(bedtime, wakeTime);
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM sleep_logs WHERE log_date = ?', [targetDate]
    );
    if (existing) {
      await db.runAsync(
        'UPDATE sleep_logs SET bedtime = ?, wake_time = ?, duration_minutes = ?, quality = ?, notes = ? WHERE id = ?',
        [bedtime, wakeTime, duration, quality, notes || null, existing.id]
      );
    } else {
      await db.runAsync(
        'INSERT INTO sleep_logs (bedtime, wake_time, duration_minutes, quality, notes, log_date) VALUES (?, ?, ?, ?, ?, ?)',
        [bedtime, wakeTime, duration, quality, notes || null, targetDate]
      );
    }
    await get().loadTodayLog(date);
    await get().loadRecentLogs();
  },

  deleteLog: async (logId) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM sleep_logs WHERE id = ?', [logId]);
    await get().loadRecentLogs();
    await get().loadTodayLog();
  },
}));

function mapSleepLog(r: Record<string, unknown>): SleepLog {
  return {
    id: r.id as number,
    bedtime: r.bedtime as string,
    wakeTime: r.wake_time as string,
    durationMinutes: r.duration_minutes as number,
    quality: r.quality as number,
    notes: r.notes as string | null,
    logDate: r.log_date as string,
    createdAt: r.created_at as string,
  };
}
