import { create } from 'zustand';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { UserProfile } from '@/types';
import { getDatabase } from '@/database/schema';
import { useGamificationStore } from '@/stores/gamificationStore';
import { parseDashboardConfig } from '@/utils/dashboard';

interface UserState {
  profile: UserProfile | null;
  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addXp: (amount: number, source: string, description: string) => Promise<void>;
  reward: (amount: number, source: string, description: string, achievementKey?: string) => Promise<void>;
}

const XP_PER_LEVEL = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000];
const LEVEL_NAMES = ['Beginner', 'Apprentice', 'Dedicated', 'Committed', 'Advanced', 'Elite', 'Master', 'Champion', 'Legend', 'Mythic'];

function calculateLevel(xp: number): number {
  for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
    if (xp >= XP_PER_LEVEL[i]) return i + 1;
  }
  return 1;
}

export function getLevelName(level: number): string {
  return LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] || 'Mythic';
}

export function getXpForNextLevel(level: number): number {
  return XP_PER_LEVEL[Math.min(level, XP_PER_LEVEL.length - 1)] || 50000;
}

export function getXpForCurrentLevel(level: number): number {
  return XP_PER_LEVEL[Math.min(level - 1, XP_PER_LEVEL.length - 1)] || 0;
}

/** Old app versions stored coarse equipment names — expand them to the granular list. */
const LEGACY_EQUIPMENT: Record<string, string[]> = {
  Band: ['Resistance Band', 'Mini Band'],
  Cable: ['Cable Machine', 'Cable Crossover', 'Lat Pulldown', 'Cable Row Station'],
  Machine: [
    'Smith Machine', 'Leg Press', 'Hack Squat Machine', 'Leg Extension Machine', 'Leg Curl Machine',
    'Calf Raise Machine', 'Chest Press Machine', 'Fly Machine', 'Shoulder Press Machine',
    'Lateral Raise Machine', 'Row Machine', 'Preacher Curl Machine', 'Bicep Curl Machine',
    'Triceps Extension Machine', 'Dip Machine', 'Assisted Weight Machine', 'Ab Crunch Machine',
    'Adductor Machine', 'Abductor Machine', 'Glute Kickback Machine', 'Hammer Strength', 'T-Bar Row',
    'Treadmill', 'Exercise Bike', 'Rowing Machine', 'Elliptical', 'Stair Climber', 'Ski Erg', 'Assault Bike',
  ],
  // Renamed in a later version — the counterweight machine assists dips AND pull-ups.
  'Assisted Pull-Up Machine': ['Assisted Weight Machine'],
  Barbell: ['Barbell', 'EZ Bar', 'Trap Bar', 'Landmine', 'Weight Plate', 'Squat Rack', 'Flat Bench', 'Incline Bench', 'Decline Bench', 'Preacher Bench', 'T-Bar Row'],
  Bodyweight: ['Bodyweight', 'Pull-Up Bar', 'Dip Bars', 'Back Extension Bench', 'Ab Wheel', 'Jump Rope', 'Box'],
  Other: ['Battle Ropes', 'Sled', 'Tire'],
};

function parseEquipment(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const expanded = new Set<string>();
    for (const item of parsed) {
      if (LEGACY_EQUIPMENT[item]) LEGACY_EQUIPMENT[item].forEach(e => expanded.add(e));
      else expanded.add(item);
    }
    return Array.from(expanded);
  } catch {
    return [];
  }
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,

  loadProfile: async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM user_profile WHERE id = 1');
    if (row) {
      set({
        profile: {
          id: row.id as number,
          name: row.name as string | null,
          age: row.age as number | null,
          weight: row.weight as number | null,
          height: row.height as number | null,
          sex: (row.sex as string | null) ?? null,
          activityLevel: row.activity_level as string | null,
          goal: (row.goal as string | null) ?? null,
          calorieTarget: row.calorie_target as number,
          proteinTarget: row.protein_target as number,
          carbsTarget: row.carbs_target as number,
          fatTarget: row.fat_target as number,
          fiberTarget: (row.fiber_target as number | null) ?? 30,
          sugarTarget: (row.sugar_target as number | null) ?? 50,
          sodiumTarget: (row.sodium_target as number | null) ?? 2300,
          waterTarget: row.water_target as number,
          monthlyBudget: row.monthly_budget as number | null,
          equipment: parseEquipment(row.equipment as string | null),
          dashboardConfig: parseDashboardConfig(row.dashboard_config as string | null),
          weightUnit: row.weight_unit as 'kg' | 'lbs',
          themePref: ((row.theme_pref as string | null) ?? 'light') as 'light' | 'dark',
          onboarded: ((row.onboarded as number | null) ?? 0) === 1,
          xp: row.xp as number,
          level: row.level as number,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
        },
      });
    }
  },

  updateProfile: async (updates) => {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: SQLiteBindValue[] = [];
    const keyMap: Record<string, string> = {
      name: 'name', age: 'age', weight: 'weight', height: 'height', sex: 'sex',
      activityLevel: 'activity_level', goal: 'goal',
      calorieTarget: 'calorie_target',
      proteinTarget: 'protein_target', carbsTarget: 'carbs_target',
      fatTarget: 'fat_target', waterTarget: 'water_target',
      fiberTarget: 'fiber_target', sugarTarget: 'sugar_target',
      sodiumTarget: 'sodium_target',
      monthlyBudget: 'monthly_budget', weightUnit: 'weight_unit',
      equipment: 'equipment', dashboardConfig: 'dashboard_config',
      themePref: 'theme_pref',
      onboarded: 'onboarded',
    };
    for (const [key, val] of Object.entries(updates)) {
      const dbKey = keyMap[key];
      if (dbKey && val !== undefined) {
        fields.push(`${dbKey} = ?`);
        values.push(
          val !== null && typeof val === 'object' ? JSON.stringify(val) // arrays + config object
            : typeof val === 'boolean' ? (val ? 1 : 0)
            : (val as SQLiteBindValue)
        );
      }
    }
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      await db.runAsync(`UPDATE user_profile SET ${fields.join(', ')} WHERE id = 1`, values);
      await get().loadProfile();
    }
  },

  addXp: async (amount, source, description) => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO xp_logs (amount, source, description) VALUES (?, ?, ?)',
      [amount, source, description]
    );
    const current = get().profile;
    const newXp = (current?.xp || 0) + amount;
    const newLevel = calculateLevel(newXp);
    await db.runAsync(
      'UPDATE user_profile SET xp = ?, level = ? WHERE id = 1',
      [newXp, newLevel]
    );
    await get().loadProfile();
    if (newLevel >= 5) await useGamificationStore.getState().checkAndUnlock('level_5');
    if (newLevel >= 10) await useGamificationStore.getState().checkAndUnlock('level_10');
  },

  reward: async (amount, source, description, achievementKey) => {
    await get().addXp(amount, source, description);
    if (achievementKey) {
      const bonus = await useGamificationStore.getState().checkAndUnlock(achievementKey);
      if (bonus > 0) {
        await get().addXp(bonus, 'achievement', `Achievement: ${achievementKey}`);
      }
    }
  },
}));
