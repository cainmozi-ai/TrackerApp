import { create } from 'zustand';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { UserProfile } from '@/types';
import { getDatabase } from '@/database/schema';
import { useGamificationStore } from '@/stores/gamificationStore';

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
          activityLevel: row.activity_level as string | null,
          goal: (row.goal as string | null) ?? null,
          calorieTarget: row.calorie_target as number,
          proteinTarget: row.protein_target as number,
          carbsTarget: row.carbs_target as number,
          fatTarget: row.fat_target as number,
          waterTarget: row.water_target as number,
          monthlyBudget: row.monthly_budget as number | null,
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
      name: 'name', age: 'age', weight: 'weight', height: 'height',
      activityLevel: 'activity_level', goal: 'goal',
      calorieTarget: 'calorie_target',
      proteinTarget: 'protein_target', carbsTarget: 'carbs_target',
      fatTarget: 'fat_target', waterTarget: 'water_target',
      monthlyBudget: 'monthly_budget', weightUnit: 'weight_unit',
      themePref: 'theme_pref',
      onboarded: 'onboarded',
    };
    for (const [key, val] of Object.entries(updates)) {
      const dbKey = keyMap[key];
      if (dbKey && val !== undefined) {
        fields.push(`${dbKey} = ?`);
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : (val as SQLiteBindValue));
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
