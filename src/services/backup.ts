import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '@/database/schema';

/** Every table that holds user data. Ordered parent-before-child so inserts
 * satisfy foreign keys; deletes run in reverse. Static seed tables (exercises,
 * achievements) are included too so row ids referenced by logs stay aligned. */
const BACKUP_TABLES = [
  'user_profile',
  'foods',
  'food_logs',
  'meal_plans',
  'shopping_list',
  'saved_meals',
  'saved_meal_items',
  'water_logs',
  'sleep_logs',
  'weight_logs',
  'exercises',
  'workout_templates',
  'template_exercises',
  'workout_logs',
  'workout_sets',
  'tasks',
  'habits',
  'habit_logs',
  'transactions',
  'budget_categories',
  'achievements',
  'xp_logs',
  'events',
  'body_measurements',
  'progress_photos',
];

const BACKUP_VERSION = 1;

export interface BackupResult {
  tables: number;
  rows: number;
}

/** Serialize the whole database to a JSON string. */
export async function buildBackupJson(): Promise<string> {
  const db = await getDatabase();
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const table of BACKUP_TABLES) {
    tables[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
  }
  return JSON.stringify({
    app: 'life-tracker',
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  });
}

/** Export the database: share a .json file on native, download it on web. */
export async function exportBackup(): Promise<void> {
  const json = await buildBackupJson();
  const filename = `life-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Save your backup' });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

/** Let the user pick a backup file and return its text, or null if cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const uri = result.assets[0].uri;
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    return res.text();
  }
  return FileSystem.readAsStringAsync(uri);
}

/** Restore a backup, replacing all current data. Runs in a single transaction
 * so a corrupt file can never leave the database half-restored. */
export async function importBackup(json: string): Promise<BackupResult> {
  let parsed: { app?: string; backupVersion?: number; tables?: Record<string, Record<string, unknown>[]> };
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("That file isn't valid JSON");
  }
  if (parsed.app !== 'life-tracker' || !parsed.tables) {
    throw new Error("That file isn't an Incus backup");
  }

  const db = await getDatabase();
  let tableCount = 0;
  let rowCount = 0;

  // FKs off while we bulk-replace; the transaction guarantees all-or-nothing.
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.withTransactionAsync(async () => {
      for (const table of BACKUP_TABLES) {
        const rows = parsed.tables![table];
        if (!Array.isArray(rows)) continue;

        // Only restore columns that exist in this app version's schema, so
        // backups survive schema changes in either direction.
        const colInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
        const validCols = new Set(colInfo.map(c => c.name));

        await db.runAsync(`DELETE FROM ${table}`);
        for (const row of rows) {
          const cols = Object.keys(row).filter(c => validCols.has(c));
          if (cols.length === 0) continue;
          await db.runAsync(
            `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
            cols.map(c => row[c] as string | number | null)
          );
          rowCount++;
        }
        tableCount++;
      }
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }

  return { tables: tableCount, rows: rowCount };
}
