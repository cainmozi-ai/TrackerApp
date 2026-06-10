import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface, Button, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { TemplateExercise, WorkoutLog } from '@/types';

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const templateId = Number(id);
  const { templates, loadTemplates, getTemplateExercises, removeTemplateExercise, deleteTemplate, getActiveWorkout, discardWorkout } = useWorkoutStore();
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [existing, setExisting] = useState<WorkoutLog | null>(null);
  const [guard, setGuard] = useState(false);

  const template = templates.find(t => t.id === templateId);

  const refresh = useCallback(async () => {
    if (templates.length === 0) await loadTemplates();
    const ex = await getTemplateExercises(templateId);
    setExercises(ex);
  }, [templateId, templates.length]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleRemove = async (teId: number) => {
    await removeTemplateExercise(teId);
    refresh();
  };

  const handleStart = async () => {
    const active = await getActiveWorkout();
    if (active) { setExisting(active); setGuard(true); return; }
    router.push(`/fitness/active-workout?templateId=${templateId}`);
  };

  const startThisRoutine = async () => {
    setGuard(false);
    if (existing) await discardWorkout(existing.id);
    router.push(`/fitness/active-workout?templateId=${templateId}`);
  };

  const handleDelete = async () => {
    await deleteTemplate(templateId);
    router.back();
  };

  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={template?.name || 'Routine'}
        right={<IconButton icon="delete-outline" onPress={handleDelete} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="plus-circle-outline" size={56} color={moduleColors.workout} />
            <Text variant="bodyMedium" style={styles.emptyText}>
              No exercises yet. Add some to build your routine.
            </Text>
          </View>
        ) : (
          exercises.map((te, i) => (
            <Surface key={te.id} style={styles.exRow} elevation={1}>
              <Text variant="titleSmall" style={styles.exIndex}>{i + 1}</Text>
              <View style={styles.exInfo}>
                <Text variant="bodyLarge">{te.exercise?.name}</Text>
                <Text variant="bodySmall" style={styles.exMeta}>
                  {te.targetSets} sets × {te.targetReps} reps · {te.exercise?.muscleGroup}
                </Text>
              </View>
              <IconButton icon="close" size={18} onPress={() => handleRemove(te.id)} />
            </Surface>
          ))
        )}

        <Button
          mode="outlined"
          icon="plus"
          style={styles.addBtn}
          onPress={() => router.push(`/fitness/exercise-library?selectFor=${templateId}`)}
        >
          Add Exercise
        </Button>
      </ScrollView>

      {exercises.length > 0 && (
        <View style={styles.startBar}>
          <Button mode="contained" icon="play" onPress={handleStart} style={styles.startBtn}>
            Start Workout
          </Button>
        </View>
      )}

      <Portal>
        <Dialog visible={guard} onDismiss={() => setGuard(false)}>
          <Dialog.Title>Workout in progress</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              You already have a workout in progress. Resume it, or discard it and start this routine?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.error} onPress={startThisRoutine}>Discard & start</Button>
            <Button onPress={() => { setGuard(false); if (existing) router.push(`/fitness/active-workout?workoutId=${existing.id}`); }}>Resume</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700', flex: 1, textAlign: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  emptyText: { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.surface,
    gap: spacing.sm,
  },
  exIndex: { color: moduleColors.workout, fontWeight: '700', width: 20 },
  exInfo: { flex: 1 },
  exMeta: { color: theme.colors.onSurfaceVariant },
  addBtn: { marginTop: spacing.sm },
  startBar: { padding: spacing.md, backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline, borderTopWidth: 1 },
  startBtn: { borderRadius: 12 },
});
