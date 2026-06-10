import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeContext';
import { moduleColors, spacing, shape, withAlpha } from '@/theme';
import { StatTile } from '@/components/common/StatTile';
import { QuickActionFab } from '@/components/common/QuickActionFab';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useWaterStore } from '@/stores/waterStore';
import { useHabitStore } from '@/stores/habitStore';
import { useSleepStore } from '@/stores/sleepStore';
import { useTaskStore } from '@/stores/taskStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserStore, getLevelName, getXpForCurrentLevel, getXpForNextLevel } from '@/stores/userStore';
import { accent } from '@/theme';
import type { WorkoutLog } from '@/types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { todayCalories, loadTodayLogs: loadFood } = useNutritionStore();
  const { todayTotal, loadTodayLogs: loadWater } = useWaterStore();
  const { habits, todayLogs: habitLogs, loadHabits, loadTodayLogs: loadHabitLogs } = useHabitStore();
  const { todayLog: sleep, loadTodayLog: loadSleep } = useSleepStore();
  const { tasks, loadTasks } = useTaskStore();
  const { transactions, loadTransactions } = useBudgetStore();
  const { getActiveWorkout } = useWorkoutStore();
  const { profile, loadProfile } = useUserStore();
  const [activeWorkout, setActiveWorkout] = useState<WorkoutLog | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadFood(); loadWater(); loadHabits(); loadHabitLogs();
      loadSleep(); loadTasks(); loadTransactions(); loadProfile();
      getActiveWorkout().then(setActiveWorkout);
    }, [])
  );

  const calorieTarget = profile?.calorieTarget || 2000;
  const waterTarget = (profile?.waterTarget || 8) * 250;
  const waterGlasses = Math.floor(todayTotal / 250);
  const habitsDone = habits.filter(h => habitLogs.some(l => l.habitId === h.id)).length;
  const pendingTasks = tasks.filter(t => !t.isCompleted).length;
  const todaySpend = transactions
    .filter(t => t.type === 'expense' && t.transactionDate === today())
    .reduce((s, t) => s + t.amount, 0);

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpCur = getXpForCurrentLevel(level);
  const xpNext = getXpForNextLevel(level);
  const xpProgress = xpNext > xpCur ? (xp - xpCur) / (xpNext - xpCur) : 1;

  const sleepHrs = sleep ? `${Math.floor(sleep.durationMinutes / 60)}h ${sleep.durationMinutes % 60}m` : '—';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="headlineMedium" style={[styles.greeting, { color: colors.onBackground }]}>{greeting()}</Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              {profile?.name || "Let's make today count"}
            </Text>
          </View>
          <IconButton icon="account-circle" size={34} iconColor={colors.primary} onPress={() => router.push('/profile')} />
        </View>

        {/* XP / level */}
        <Animated.View entering={FadeInUp} style={[styles.xpCard, { backgroundColor: colors.surface }]}>
          <View style={styles.xpHeader}>
            <View style={styles.levelBadge}>
              <MaterialCommunityIcons name="star-four-points" size={18} color={moduleColors.gamification} />
              <Text variant="titleMedium" style={[styles.levelText, { color: colors.onSurface }]}>Lv. {level}</Text>
              <Text variant="labelMedium" style={{ color: moduleColors.gamification }}>{getLevelName(level)}</Text>
            </View>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{xp} XP</Text>
          </View>
          <View style={[styles.xpTrack, { backgroundColor: withAlpha(colors.primary, 0.16) }]}>
            <View style={[styles.xpFill, { width: `${Math.min(xpProgress * 100, 100)}%`, backgroundColor: colors.primary }]} />
          </View>
        </Animated.View>

        {activeWorkout && (
          <Pressable
            onPress={() => router.push(`/fitness/active-workout?workoutId=${activeWorkout.id}`)}
            style={[styles.resumeBanner, { backgroundColor: withAlpha(accent, 0.16), borderColor: accent }]}
          >
            <MaterialCommunityIcons name="play-circle" size={24} color={accent} />
            <View style={styles.resumeText}>
              <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>Workout in progress</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{activeWorkout.name} · tap to resume</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
        )}

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onBackground }]}>Today</Text>

        {/* Bento grid */}
        <View style={styles.bento}>
          <StatTile index={0} icon="fire" color={moduleColors.nutrition}
            value={String(todayCalories)} label="calories" caption={`/ ${calorieTarget}`}
            progress={todayCalories / calorieTarget} onPress={() => router.push('/health/nutrition')} />
          <StatTile index={1} icon="cup-water" color={moduleColors.water}
            value={String(waterGlasses)} label="glasses" caption={`/ ${profile?.waterTarget || 8}`}
            progress={todayTotal / waterTarget} onPress={() => router.push('/health/water')} />
          <StatTile index={2} icon="repeat" color={moduleColors.habits}
            value={`${habitsDone}/${habits.length}`} label="habits"
            progress={habits.length ? habitsDone / habits.length : 0} onPress={() => router.push('/life/habits')} />
          <StatTile index={3} icon="moon-waning-crescent" color={moduleColors.sleep}
            value={sleepHrs} label="slept" onPress={() => router.push('/health/sleep')} />
          <StatTile index={4} icon="checkbox-marked-outline" color={moduleColors.tasks}
            value={String(pendingTasks)} label="tasks left" onPress={() => router.push('/life/tasks')} />
          <StatTile index={5} icon="wallet" color={moduleColors.budget}
            value={`$${todaySpend.toFixed(0)}`} label="spent today" onPress={() => router.push('/life/budget')} />
        </View>
      </ScrollView>

      <QuickActionFab
        actions={[
          { icon: 'food-apple', label: 'Log Meal', color: moduleColors.nutrition, onPress: () => router.push('/health/nutrition/search') },
          { icon: 'dumbbell', label: 'Start Workout', color: moduleColors.workout, onPress: () => router.push('/fitness/template-builder') },
          { icon: 'checkbox-marked-outline', label: 'Add Task', color: moduleColors.tasks, onPress: () => router.push('/life/tasks/add-task') },
          { icon: 'cup-water', label: 'Log Water', color: moduleColors.water, onPress: () => router.push('/health/water') },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft: { flex: 1 },
  greeting: { fontWeight: '800' },
  xpCard: {
    padding: spacing.md,
    borderRadius: shape.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelText: { fontWeight: '800' },
  xpTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4 },
  sectionTitle: { fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  bento: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  resumeBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: shape.lg, borderWidth: 1.5, marginTop: spacing.md },
  resumeText: { flex: 1 },
});
