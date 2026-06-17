/** Health Connect step reader (Android). On web, Metro resolves the .web.ts
 * stub instead, so the native module is never bundled there. Every call is
 * defensive and degrades to "unavailable" rather than throwing. */
import { Platform } from 'react-native';
import {
  initialize,
  getSdkStatus,
  requestPermission,
  aggregateGroupByDuration,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { localDate } from '@/utils/dates';

export interface DailySteps {
  date: string;
  steps: number;
}

let initialized = false;
async function ensureInit(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    if (!initialized) initialized = await initialize();
    return initialized;
  } catch {
    return false;
  }
}

/** True when Health Connect is installed and usable on this device. */
export async function isStepsAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

/** Prompt for READ_STEPS. Returns true if granted. */
export async function requestStepsPermission(): Promise<boolean> {
  if (!(await ensureInit())) return false;
  try {
    const granted = await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
    return Array.isArray(granted) && granted.length > 0;
  } catch {
    return false;
  }
}

/** Daily step totals between two dates (inclusive of start day). */
export async function getDailySteps(startISO: string, endISO: string): Promise<DailySteps[]> {
  if (!(await ensureInit())) return [];
  try {
    const buckets = await aggregateGroupByDuration({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
      timeRangeSlicer: { duration: 'DAYS', length: 1 },
    });
    return (buckets ?? []).map((b: unknown) => {
      const rec = b as { startTime: string; result?: { COUNT_TOTAL?: number } };
      return { date: localDate(new Date(rec.startTime)), steps: Math.round(rec.result?.COUNT_TOTAL ?? 0) };
    });
  } catch {
    return [];
  }
}
