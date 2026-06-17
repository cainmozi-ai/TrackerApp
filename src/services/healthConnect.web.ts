/** Web stub — Health Connect is Android-only. Metro picks this on web so the
 * native module is never bundled there. */

export interface DailySteps {
  date: string;
  steps: number;
}

export async function isStepsAvailable(): Promise<boolean> {
  return false;
}

export async function requestStepsPermission(): Promise<boolean> {
  return false;
}

export async function getDailySteps(): Promise<DailySteps[]> {
  return [];
}
