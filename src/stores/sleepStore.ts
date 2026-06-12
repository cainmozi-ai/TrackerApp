import { create } from 'zustand';
import type { SleepLog } from '@/types';
import { getDatabase } from '@/database/schema';
import { localToday } from '@/utils/dates';

interface SleepState {
  recentLogs: SleepLog[];
  todayLog: SleepLog | null;
  loadRecentLogs: (days?: number) => Promise<void>;
  loadTodayLog: (date?: string) => Promise<void>;
  logSleep: (bedtime: string, wakeTime: string, quality: number, notes?: string, date?: string) => Promise<void>;
  deleteLog: (logId: number) => Promise<void>;
}

function getToday(): string {
  return localToday();
}

/** Tolerant "HH:MM"-ish parser: accepts 23:00, 7:30, 07.30, 2300, 7. Returns minutes since midnight or null. */
export function parseTimeToMinutes(raw: string): number | null {
  const t = raw.trim();
  let m = t.match(/^(\d{1,2})[:.\s](\d{2})$/);
  if (!m) m = t.match(/^(\d{1,2})(\d{2})$/); // 2300
  if (!m) {
    const hOnly = t.match(/^(\d{1,2})$/);
    if (hOnly) m = [t, hOnly[1], '00'] as unknown as RegExpMatchArray;
  }
  if (!m) return null;
  const h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Normalize any accepted time entry to canonical HH:MM for storage/display. */
export function normalizeTime(raw: string): string | null {
  const mins = parseTimeToMinutes(raw);
  if (mins == null) return null;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function calculateDuration(bedtime: string, wakeTime: string): number | null {
  const bed = parseTimeToMinutes(bedtime);
  const wake = parseTimeToMinutes(wakeTime);
  if (bed == null || wake == null) return null;
  // Crossing midnight: 23:00 → 07:00 = 8h.
  return wake > bed ? wake - bed : wake + 24 * 60 - bed;
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
    const bed = normalizeTime(bedtime);
    const wake = normalizeTime(wakeTime);
    const duration = calculateDuration(bedtime, wakeTime);
    if (bed == null || wake == null || duration == null) {
      throw new Error('Enter times like 23:00 and 07:00');
    }
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM sleep_logs WHERE log_date = ?', [targetDate]
    );
    if (existing) {
      await db.runAsync(
        'UPDATE sleep_logs SET bedtime = ?, wake_time = ?, duration_minutes = ?, quality = ?, notes = ? WHERE id = ?',
        [bed, wake, duration, quality, notes || null, existing.id]
      );
    } else {
      await db.runAsync(
        'INSERT INTO sleep_logs (bedtime, wake_time, duration_minutes, quality, notes, log_date) VALUES (?, ?, ?, ?, ?, ?)',
        [bed, wake, duration, quality, notes || null, targetDate]
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
