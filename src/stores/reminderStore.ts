import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getDatabase } from '@/database/schema';

export type ReminderType = 'workout' | 'habit' | 'water' | 'streak';

export interface Reminder {
  type: ReminderType;
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface ReminderDef {
  type: ReminderType;
  label: string;
  icon: string;
  description: string;
  defaultHour: number;
  defaultMinute: number;
}

/** The reminders the user can turn on, in display order. */
export const REMINDER_DEFS: ReminderDef[] = [
  { type: 'workout', label: 'Workout reminder', icon: 'dumbbell', description: "On days you've planned a routine in your Weekly Split", defaultHour: 17, defaultMinute: 30 },
  { type: 'habit', label: 'Daily habits', icon: 'check-circle-outline', description: 'A nudge to tick off your habits', defaultHour: 20, defaultMinute: 0 },
  { type: 'water', label: 'Hydration', icon: 'cup-water', description: 'A reminder to drink water', defaultHour: 14, defaultMinute: 0 },
  { type: 'streak', label: 'Streak check', icon: 'fire', description: "Evening 'keep your streak alive' nudge", defaultHour: 20, defaultMinute: 30 },
];

const isWeb = Platform.OS === 'web';
let handlerReady = false;

/** Configure the foreground handler + Android channel. Safe to call repeatedly. */
export async function initNotifications(): Promise<void> {
  if (isWeb || handlerReady) return;
  handlerReady = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#E5322B',
      });
    }
  } catch {
    // Notification setup is best-effort; the app must still run without it.
  }
}

function defFor(type: ReminderType): ReminderDef {
  return REMINDER_DEFS.find(d => d.type === type)!;
}

interface ReminderState {
  reminders: Record<ReminderType, Reminder>;
  permission: 'granted' | 'denied' | 'undetermined';
  loadReminders: () => Promise<void>;
  ensurePermission: () => Promise<boolean>;
  setReminder: (type: ReminderType, patch: Partial<Reminder>) => Promise<void>;
  /** Re-apply the workout reminder after the weekly split changes. */
  rescheduleWorkout: () => Promise<void>;
}

function blankReminders(): Record<ReminderType, Reminder> {
  const out = {} as Record<ReminderType, Reminder>;
  for (const d of REMINDER_DEFS) out[d.type] = { type: d.type, enabled: false, hour: d.defaultHour, minute: d.defaultMinute };
  return out;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: blankReminders(),
  permission: 'undetermined',

  loadReminders: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ type: string; enabled: number; hour: number; minute: number }>(
      'SELECT type, enabled, hour, minute FROM reminders');
    const map = blankReminders();
    for (const r of rows) {
      if (map[r.type as ReminderType]) {
        map[r.type as ReminderType] = { type: r.type as ReminderType, enabled: r.enabled === 1, hour: r.hour, minute: r.minute };
      }
    }
    set({ reminders: map });
    if (!isWeb) {
      try {
        const perm = await Notifications.getPermissionsAsync();
        set({ permission: perm.granted ? 'granted' : perm.canAskAgain ? 'undetermined' : 'denied' });
      } catch { /* ignore */ }
    }
  },

  ensurePermission: async () => {
    if (isWeb) return false;
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) { set({ permission: 'granted' }); return true; }
      const req = await Notifications.requestPermissionsAsync();
      set({ permission: req.granted ? 'granted' : 'denied' });
      return req.granted;
    } catch {
      return false;
    }
  },

  setReminder: async (type, patch) => {
    const prev = get().reminders[type];
    const next: Reminder = { ...prev, ...patch };
    // Persist first so the toggle sticks even if scheduling fails.
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO reminders (type, enabled, hour, minute) VALUES (?, ?, ?, ?)
       ON CONFLICT(type) DO UPDATE SET enabled = excluded.enabled, hour = excluded.hour, minute = excluded.minute`,
      [type, next.enabled ? 1 : 0, next.hour, next.minute]
    );
    set({ reminders: { ...get().reminders, [type]: next } });

    if (next.enabled) {
      const ok = await get().ensurePermission();
      if (!ok) return;
    }
    await applySchedule(type, next);
  },

  rescheduleWorkout: async () => {
    const r = get().reminders.workout;
    if (r) await applySchedule('workout', r);
  },
}));

/** Cancel any notifications previously scheduled for a reminder, then (if enabled
 * and not on web) schedule fresh ones. The scheduled ids are stored back on the row. */
async function applySchedule(type: ReminderType, r: Reminder): Promise<void> {
  if (isWeb) return;
  const db = await getDatabase();
  try {
    const row = await db.getFirstAsync<{ notif_ids: string | null }>('SELECT notif_ids FROM reminders WHERE type = ?', [type]);
    const old: string[] = row?.notif_ids ? JSON.parse(row.notif_ids) : [];
    for (const id of old) {
      try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already gone */ }
    }

    const ids: string[] = [];
    if (r.enabled) {
      await initNotifications();
      if (type === 'workout') {
        // One weekly notification per day that has a routine assigned.
        const days = await db.getAllAsync<{ day_of_week: number; name: string }>(
          `SELECT ws.day_of_week, t.name FROM weekly_schedule ws
           JOIN workout_templates t ON ws.template_id = t.id
           WHERE ws.template_id IS NOT NULL`);
        for (const d of days) {
          const id = await Notifications.scheduleNotificationAsync({
            content: { title: 'Time to train 💪', body: `Today's session: ${d.name}` },
            // expo weekday: 1 = Sunday … 7 = Saturday; our day_of_week is 0 = Sunday.
            trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: d.day_of_week + 1, hour: r.hour, minute: r.minute },
          });
          ids.push(id);
        }
      } else {
        const content = REMINDER_CONTENT[type];
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute },
        });
        ids.push(id);
      }
    }
    await db.runAsync('UPDATE reminders SET notif_ids = ? WHERE type = ?', [JSON.stringify(ids), type]);
  } catch {
    // Scheduling failure must not break the toggle; the pref is already saved.
  }
}

const REMINDER_CONTENT: Record<Exclude<ReminderType, 'workout'>, { title: string; body: string }> = {
  habit: { title: 'Habit check ✅', body: "Don't forget to tick off today's habits." },
  water: { title: 'Stay hydrated 💧', body: 'Time for a glass of water.' },
  streak: { title: 'Keep your streak alive 🔥', body: 'Log something before the day ends.' },
};

export function formatTime(hour: number, minute: number): string {
  const h = ((hour + 11) % 12) + 1;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}
