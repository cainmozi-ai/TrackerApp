import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { moduleColors, spacing, shape } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { MotionCard } from '@/components/common/MotionCard';
import { HabitTile } from '@/components/habits/HabitTile';
import { useHabitStore } from '@/stores/habitStore';
import { useUserStore } from '@/stores/userStore';

export default function HabitsScreen() {
  const { colors } = useAppTheme();
  const { habits, todayLogs, loadHabits, loadTodayLogs, toggleHabit, getStreak } = useHabitStore();
  const { reward } = useUserStore();
  const [streaks, setStreaks] = useState<Record<number, number>>({});

  useFocusEffect(useCallback(() => { loadHabits(); loadTodayLogs(); }, []));
  useFocusEffect(useCallback(() => {
    (async () => {
      const r: Record<number, number> = {};
      for (const h of habits) r[h.id] = await getStreak(h.id);
      setStreaks(r);
    })();
  }, [habits, todayLogs]));

  const isDone = (id: number) => todayLogs.some(l => l.habitId === id);
  const completed = habits.filter(h => isDone(h.id)).length;

  const handleToggle = async (id: number) => {
    const wasDone = isDone(id);
    await toggleHabit(id);
    if (!wasDone) {
      const nowAll = habits.every(h => h.id === id || isDone(h.id));
      if (nowAll && habits.length > 1) await reward(25, 'habits', 'Completed all habits today');
      const streak = await getStreak(id);
      if (streak === 7) await reward(0, 'habits', '7-day streak', 'streak_7');
      if (streak === 30) await reward(0, 'habits', '30-day streak', 'streak_30');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Habits" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {habits.length > 0 && (
          <MotionCard style={styles.summary} noEnter>
            <Text variant="displaySmall" style={[styles.count, { color: moduleColors.habits }]}>
              {completed}/{habits.length}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              {completed === habits.length ? 'All done — amazing! 🎉' : 'completed today'}
            </Text>
          </MotionCard>
        )}

        {habits.length === 0 ? (
          <EmptyState
            icon="repeat"
            color={moduleColors.habits}
            title="Build your first habit"
            body="Small daily wins add up. Tap below to add a habit and start a streak."
            actionLabel="Add a Habit"
            onAction={() => router.push('/life/habits/add-habit')}
          />
        ) : (
          <View style={styles.grid}>
            {habits.map(h => (
              <HabitTile
                key={h.id}
                name={h.name}
                icon={h.icon}
                done={isDone(h.id)}
                streak={streaks[h.id] ?? 0}
                onToggle={() => handleToggle(h.id)}
                onLongPress={() => router.push(`/life/habits/${h.id}`)}
              />
            ))}
          </View>
        )}

        {habits.length > 0 && (
          <Text variant="labelSmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
            Tap to complete · long-press for stats
          </Text>
        )}
      </ScrollView>

      <FAB icon="plus" style={[styles.fab, { backgroundColor: moduleColors.habits }]} color="#fff"
        onPress={() => router.push('/life/habits/add-habit')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  summary: { alignItems: 'center', marginBottom: spacing.lg, paddingVertical: spacing.lg },
  count: { fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { textAlign: 'center', marginTop: spacing.sm },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: shape.pill },
});
