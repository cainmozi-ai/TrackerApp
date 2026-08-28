import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { Text, Portal, Dialog, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { moduleColors, spacing, shape, accent, withAlpha } from '@/theme';
import { AppCard } from '@/components/common/AppCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { WorkoutLog } from '@/types';

export default function FitnessScreen() {
  const { colors } = useAppTheme();
  const { getActiveWorkout, discardWorkout, loadTemplates, getWeeklySchedule } = useWorkoutStore();
  const [active, setActive] = useState<WorkoutLog | null>(null);
  const [guard, setGuard] = useState(false);
  const [todaySplit, setTodaySplit] = useState<{ id: number; name: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      getActiveWorkout().then(setActive);
      (async () => {
        await loadTemplates();
        const sched = await getWeeklySchedule();
        const tid = sched[new Date().getDay()];
        const t = tid ? useWorkoutStore.getState().templates.find(x => x.id === tid) : null;
        setTodaySplit(t ? { id: t.id, name: t.name } : null);
      })();
    }, [])
  );

  const resume = () => {
    if (active) router.push(`/fitness/active-workout?workoutId=${active.id}`);
  };

  const startNew = async () => {
    setGuard(false);
    if (active) {
      await discardWorkout(active.id);
      setActive(null);
    }
    router.push('/fitness/active-workout');
  };

  const onStartPress = () => {
    if (active) setGuard(true);
    else router.push('/fitness/active-workout');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="headlineMedium" style={[styles.title, { color: colors.onBackground }]}>Fitness</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Build routines and track your progress
        </Text>

        {active && (
          <Pressable onPress={resume} style={[styles.resumeBanner, { backgroundColor: withAlpha(accent, 0.16), borderColor: accent }]}>
            <MaterialCommunityIcons name="play-circle" size={26} color={accent} />
            <View style={styles.resumeText}>
              <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>Workout in progress</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {active.name} · tap to resume
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        )}

        {todaySplit && (
          <Pressable onPress={() => router.push(`/fitness/active-workout?templateId=${todaySplit.id}`)}
            style={[styles.resumeBanner, { backgroundColor: withAlpha(accent, 0.12), borderColor: accent }]}>
            <MaterialCommunityIcons name="calendar-star" size={26} color={accent} />
            <View style={styles.resumeText}>
              <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>Today's split</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{todaySplit.name} · tap to start</Text>
            </View>
            <MaterialCommunityIcons name="play-circle" size={24} color={accent} />
          </Pressable>
        )}

        <SectionHeader title="Modules" />

        <AppCard index={0} title="Start Workout" icon="play-circle" color={colors.primary}
          subtitle="Begin a new workout session" onPress={onStartPress} />
        <AppCard index={1} title="Programs" icon="podium" color={accent}
          subtitle="Leveled routines: beginner → advanced" onPress={() => router.push('/fitness/programs')} />
        <AppCard index={2} title="My Routines" icon="clipboard-list" color={moduleColors.workout}
          subtitle="Create and manage workout templates" onPress={() => router.push('/fitness/template-builder')} />
        <AppCard index={3} title="Exercise Library" icon="book-open-variant" color="#7E57C2"
          subtitle="Browse 90+ exercises by muscle group" onPress={() => router.push('/fitness/exercise-library')} />
        <AppCard index={4} title="Progress" icon="chart-line" color={moduleColors.habits}
          subtitle="View your strength and volume trends" onPress={() => router.push('/fitness/progress')} />
        <AppCard index={5} title="Weekly Split" icon="calendar-week" color={accent}
          subtitle="Plan a routine for each day" onPress={() => router.push('/fitness/weekly-split')} />
        <AppCard index={6} title="Cardio" icon="heart-pulse" color="#FF8A65"
          subtitle="Log runs, rides, rows & more" onPress={() => router.push('/fitness/cardio')} />
        <AppCard index={7} title="Records" icon="trophy" color="#F5B301"
          subtitle="Personal bests & strength standards" onPress={() => router.push('/fitness/records')} />
      </ScrollView>

      <Portal>
        <Dialog visible={guard} onDismiss={() => setGuard(false)}>
          <Dialog.Title>Workout in progress</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              You already have a workout in progress. Resume it, or discard it and start fresh?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.error} onPress={startNew}>Discard & new</Button>
            <Button onPress={() => { setGuard(false); resume(); }}>Resume</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { fontWeight: '800' },
  subtitle: { marginTop: 2, marginBottom: spacing.md },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: shape.lg,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  resumeText: { flex: 1 },
});
