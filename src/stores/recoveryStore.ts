import { create } from 'zustand';
import { getDatabase } from '@/database/schema';
import { localDate } from '@/utils/dates';

export interface RecoveryLog {
  id: number;
  type: string;
  durationMinutes: number | null;
  notes: string | null;
  logDate: string;
}

/** Recovery modalities offered as quick-log options. `icon` values are
 * MaterialCommunityIcons names. */
export const RECOVERY_TYPES: { key: string; label: string; icon: string }[] = [
  { key: 'sauna', label: 'Sauna', icon: 'radiator' },
  { key: 'ice_bath', label: 'Ice Bath', icon: 'snowflake' },
  { key: 'cold_shower', label: 'Cold Shower', icon: 'shower' },
  { key: 'mobility', label: 'Mobility', icon: 'yoga' },
  { key: 'foam_rolling', label: 'Foam Roll', icon: 'sine-wave' },
  { key: 'massage', label: 'Massage', icon: 'hand-heart' },
  { key: 'meditation', label: 'Meditation', icon: 'meditation' },
  { key: 'walk', label: 'Walk', icon: 'walk' },
  { key: 'nap', label: 'Nap', icon: 'power-sleep' },
];

export function recoveryLabel(type: string): string {
  return RECOVERY_TYPES.find(t => t.key === type)?.label ?? type;
}
export function recoveryIcon(type: string): string {
  return RECOVERY_TYPES.find(t => t.key === type)?.icon ?? 'heart-pulse';
}

function map(r: Record<string, unknown>): RecoveryLog {
  return {
    id: r.id as number,
    type: r.type as string,
    durationMinutes: (r.duration_minutes as number | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    logDate: r.log_date as string,
  };
}

interface RecoveryState {
  today: RecoveryLog[];
  recent: RecoveryLog[];
  currentDate: string;
  loadToday: (date?: string) => Promise<void>;
  loadRecent: (limit?: number) => Promise<void>;
  addRecovery: (type: string, durationMinutes?: number | null, notes?: string | null, date?: string) => Promise<void>;
  removeRecovery: (id: number) => Promise<void>;
}

export const useRecoveryStore = create<RecoveryState>((set, get) => ({
  today: [],
  recent: [],
  currentDate: localDate(),

  loadToday: async (date) => {
    const db = await getDatabase();
    const d = date ?? localDate();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM recovery_logs WHERE log_date = ? ORDER BY created_at DESC', [d]);
    set({ today: rows.map(map), currentDate: d });
  },

  loadRecent: async (limit = 30) => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM recovery_logs ORDER BY log_date DESC, created_at DESC LIMIT ?', [limit]);
    set({ recent: rows.map(map) });
  },

  addRecovery: async (type, durationMinutes = null, notes = null, date) => {
    const db = await getDatabase();
    const d = date ?? localDate();
    await db.runAsync(
      'INSERT INTO recovery_logs (type, duration_minutes, notes, log_date) VALUES (?, ?, ?, ?)',
      [type, durationMinutes, notes, d]);
    await get().loadToday(get().currentDate);
    await get().loadRecent();
  },

  removeRecovery: async (id) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM recovery_logs WHERE id = ?', [id]);
    await get().loadToday(get().currentDate);
    await get().loadRecent();
  },
}));
