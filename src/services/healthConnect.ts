/** Health Connect step reader (Android). On web, Metro resolves the .web.ts
 * stub instead, so the native module is never bundled there. Every call is
 * defensive and degrades to "unavailable" rather than throwing. */
import { Platform } from 'react-native';
import {
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  openHealthConnectSettings,
  aggregateGroupByDuration,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { localDate } from '@/utils/dates';

export interface DailySteps {
  date: string;
  steps: number;
}

/** Where the user is in the connect flow, so the UI can show the right action:
 *  - unavailable: Health Connect isn't installed on this device
 *  - update-required: installed but the provider needs a Play Store update
 *  - needs-permission: installed & ready, but we don't have read-steps access yet
 *  - ready: installed and steps permission granted */
export type StepsState = 'unavailable' | 'update-required' | 'needs-permission' | 'ready';

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

/** Whether we already hold read access to Steps. */
async function hasStepsPermission(): Promise<boolean> {
  if (!(await ensureInit())) return false;
  try {
    const granted = await getGrantedPermissions();
    return Array.isArray(granted)
      && granted.some(p => p.recordType === 'Steps' && p.accessType === 'read');
  } catch {
    return false;
  }
}

/** Single check that drives the Steps screen's UI state. */
export async function getStepsState(): Promise<StepsState> {
  if (Platform.OS !== 'android') return 'unavailable';
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update-required';
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return 'unavailable';
    return (await hasStepsPermission()) ? 'ready' : 'needs-permission';
  } catch {
    return 'unavailable';
  }
}

/** Prompt for READ_STEPS. Returns true if granted. */
export async function requestStepsPermission(): Promise<boolean> {
  if (!(await ensureInit())) return false;
  try {
    await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
    // The resolved array can come back empty even after a grant on some
    // providers, so confirm against the live granted-permissions list.
    return await hasStepsPermission();
  } catch {
    return false;
  }
}

/** Opens the Health Connect app's permission screen for Life Tracker. */
export async function openSettings(): Promise<void> {
  try {
    await openHealthConnectSettings();
  } catch {
    /* no-op */
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
