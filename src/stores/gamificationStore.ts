import { create } from 'zustand';
import type { Achievement } from '@/types';
import { getDatabase } from '@/database/schema';

interface GamificationState {
  achievements: Achievement[];
  loadAchievements: () => Promise<void>;
  /** Unlocks the achievement if not already unlocked. Returns the XP reward (0 if already unlocked or missing). */
  checkAndUnlock: (key: string) => Promise<number>;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  achievements: [],

  loadAchievements: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM achievements ORDER BY unlocked_at IS NULL, unlocked_at DESC, id'
    );
    set({
      achievements: rows.map(r => ({
        id: r.id as number,
        key: r.key as string,
        name: r.name as string,
        description: r.description as string,
        icon: r.icon as string,
        xpReward: r.xp_reward as number,
        unlockedAt: r.unlocked_at as string | null,
      })),
    });
  },

  checkAndUnlock: async (key) => {
    const db = await getDatabase();
    const achievement = await db.getFirstAsync<{ id: number; unlocked_at: string | null; xp_reward: number }>(
      'SELECT id, unlocked_at, xp_reward FROM achievements WHERE key = ?',
      [key]
    );
    if (achievement && !achievement.unlocked_at) {
      await db.runAsync(
        "UPDATE achievements SET unlocked_at = datetime('now') WHERE id = ?",
        [achievement.id]
      );
      await get().loadAchievements();
      return achievement.xp_reward;
    }
    return 0;
  },
}));
