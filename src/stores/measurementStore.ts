import { create } from 'zustand';
import { getDatabase } from '@/database/schema';
import { localToday } from '@/utils/dates';

export const MEASUREMENT_FIELDS = ['neck', 'shoulders', 'chest', 'waist', 'hips', 'bicep', 'thigh', 'calf'] as const;
export type MeasurementField = typeof MEASUREMENT_FIELDS[number];

export interface BodyMeasurement {
  id: number;
  logDate: string;
  values: Partial<Record<MeasurementField, number>>;
  createdAt: string;
}

export interface ProgressPhoto {
  id: number;
  uri: string;
  logDate: string;
  notes: string | null;
  createdAt: string;
}

interface MeasurementState {
  history: BodyMeasurement[];
  photos: ProgressPhoto[];
  loadHistory: () => Promise<void>;
  logMeasurement: (values: Partial<Record<MeasurementField, number>>, date?: string) => Promise<void>;
  deleteMeasurement: (id: number) => Promise<void>;
  loadPhotos: () => Promise<void>;
  addPhoto: (uri: string, notes?: string, date?: string) => Promise<void>;
  deletePhoto: (id: number) => Promise<void>;
}

function getToday(): string {
  return localToday();
}

export const useMeasurementStore = create<MeasurementState>((set, get) => ({
  history: [],
  photos: [],

  loadHistory: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM body_measurements ORDER BY log_date DESC, id DESC LIMIT 60'
    );
    set({
      history: rows.map(r => ({
        id: r.id as number,
        logDate: r.log_date as string,
        createdAt: r.created_at as string,
        values: Object.fromEntries(
          MEASUREMENT_FIELDS.filter(f => r[f] != null).map(f => [f, r[f] as number])
        ),
      })),
    });
  },

  logMeasurement: async (values, date) => {
    const filled = MEASUREMENT_FIELDS.filter(f => values[f] != null);
    if (filled.length === 0) return;
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO body_measurements (log_date, ${filled.join(', ')}) VALUES (?, ${filled.map(() => '?').join(', ')})`,
      [date || getToday(), ...filled.map(f => values[f]!)]
    );
    await get().loadHistory();
  },

  deleteMeasurement: async (id) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM body_measurements WHERE id = ?', [id]);
    await get().loadHistory();
  },

  loadPhotos: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM progress_photos ORDER BY log_date DESC, id DESC'
    );
    set({
      photos: rows.map(r => ({
        id: r.id as number,
        uri: r.uri as string,
        logDate: r.log_date as string,
        notes: r.notes as string | null,
        createdAt: r.created_at as string,
      })),
    });
  },

  addPhoto: async (uri, notes, date) => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO progress_photos (uri, log_date, notes) VALUES (?, ?, ?)',
      [uri, date || getToday(), notes || null]
    );
    await get().loadPhotos();
  },

  deletePhoto: async (id) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM progress_photos WHERE id = ?', [id]);
    await get().loadPhotos();
  },
}));
