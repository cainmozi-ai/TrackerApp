/** Web stub — Health Connect is Android-only. Metro picks this on web so the
 * native module is never bundled there. */

export interface DailySteps {
  date: string;
  steps: number;
}

export type StepsState = 'unavailable' | 'update-required' | 'needs-permission' | 'ready';

export async function isStepsAvailable(): Promise<boolean> {
  return false;
}

export async function getStepsState(): Promise<StepsState> {
  return 'unavailable';
}

export async function requestStepsPermission(): Promise<boolean> {
  return false;
}

export interface ConnectResult {
  ok: boolean;
  info: string;
}

export async function connectSteps(): Promise<ConnectResult> {
  return { ok: false, info: 'Not running on Android.' };
}

export async function openSettings(): Promise<void> {
  /* no-op on web */
}

export async function getDailySteps(): Promise<DailySteps[]> {
  return [];
}
