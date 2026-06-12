/** Local-timezone date helpers.
 *
 * The app's day boundaries must follow the user's clock, not UTC.
 * `new Date().toISOString()` returns UTC, which shifts anything logged late at
 * night onto the wrong day (e.g. 00:30 BST is 23:30 UTC *yesterday*). Always
 * use these helpers instead of toISOString for log dates and timestamps.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD for the given date in the device's local timezone. */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's date (local timezone). */
export function localToday(): string {
  return localDate();
}

/** 'YYYY-MM-DD HH:MM:SS' local — same format SQLite's datetime() produces. */
export function localNow(): string {
  const d = new Date();
  return `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Local date N days before today. */
export function localDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDate(d);
}

/** Parse a 'YYYY-MM-DD HH:MM:SS' DB timestamp as local time. */
export function parseDbDateTime(s: string): Date {
  return new Date(s.replace(' ', 'T'));
}
