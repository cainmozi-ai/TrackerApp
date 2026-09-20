import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { Text, Portal, Dialog, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
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

        <Text variant="labelSmall" style={[styles.kicker, { color: colors.onSurfaceVariant }]}>MODULES</Text>
        <ModuleRow title="Start Workout" subtitle="Begin a new workout session" icon="play" color={accent} onPress={onStartPress} />
        <ModuleRow title="Programs" subtitle="Leveled routines: beginner to advanced" icon="podium" color={accent} onPress={() => router.push('/fitness/programs')} />
        <ModuleRow title="My Routines" subtitle="Create and manage workout templates" icon="clipboard-list" color="#C7B8A5" onPress={() => router.push('/fitness/template-builder')} />
        <ModuleRow title="Exercise Library" subtitle="Browse 190 exercises by muscle group" icon="book-open-variant" color="#8C62D9" onPress={() => router.push('/fitness/exercise-library')} />

        <Text variant="labelSmall" style={[styles.kicker, styles.moreKicker, { color: colors.onSurfaceVariant }]}>MORE TRAINING</Text>
        <View style={styles.moreGrid}>
          <MiniLink icon="chart-line" label="Progress" onPress={() => router.push('/fitness/progress')} />
          <MiniLink icon="calendar-week" label="Weekly Split" onPress={() => router.push('/fitness/weekly-split')} />
          <MiniLink icon="heart-pulse" label="Cardio" onPress={() => router.push('/fitness/cardio')} />
          <MiniLink icon="trophy" label="Records" onPress={() => router.push('/fitness/records')} />
          <MiniLink icon="history" label="History" onPress={() => router.push('/fitness/history')} />
        </View>
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

function ModuleRow({ title, subtitle, icon, color, onPress }: {
  title: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.moduleRow, { backgroundColor: colors.surface }]}>
      <View style={[styles.moduleIcon, { backgroundColor: withAlpha(color, 0.16) }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.moduleCopy}>
        <Text variant="titleMedium" style={{ color: colors.onSurface }}>{title}</Text>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
    </Pressable>
  );
}

function MiniLink({ icon, label, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.miniLink, { backgroundColor: colors.surface }]}> 
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <Text variant="labelMedium" style={{ color: colors.onSurface }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { fontWeight: '400' },
  subtitle: { marginTop: 2, marginBottom: spacing.lg },
  kicker: { fontWeight: '700', marginBottom: spacing.sm },
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
  moduleRow: { height: 72, borderRadius: shape.lg, marginBottom: 12, flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: 14 },
  moduleIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  moduleCopy: { flex: 1, gap: 2 },
  moreKicker: { marginTop: spacing.lg },
  moreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  miniLink: { width: '48%', height: 52, borderRadius: shape.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
});
