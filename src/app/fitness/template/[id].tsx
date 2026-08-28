import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, IconButton, Surface, Button, Portal, Dialog, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useWorkoutStore } from '@/stores/workoutStore';
import { mechanicLabel } from '@/utils/muscles';
import { effectiveIncrement } from '@/utils/progression';
import type { TemplateExercise, WorkoutLog } from '@/types';

/** Compact +/- stepper with a numeric field, for editing routine targets. */
function Stepper({ label, value, step, min, onChange }: {
  label: string; value: string; step: number; min: number; onChange: (v: string) => void;
}) {
  const { colors } = useAppTheme();
  const num = parseFloat(value) || 0;
  const setNum = (n: number) => onChange(String(Math.max(min, Math.round(n * 100) / 100)));
  return (
    <View style={styles.stepRow}>
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, flex: 1 }}>{label}</Text>
      <IconButton icon="minus" size={16} mode="contained-tonal" style={styles.stepBtn} onPress={() => setNum(num - step)} />
      <TextInput
        mode="outlined" dense keyboardType="numeric" value={value}
        onChangeText={onChange} style={styles.stepInput} contentStyle={styles.stepInputContent}
      />
      <IconButton icon="plus" size={16} mode="contained-tonal" style={styles.stepBtn} onPress={() => setNum(num + step)} />
    </View>
  );
}

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const templateId = Number(id);
  const {
    templates, loadTemplates, getTemplateExercises, removeTemplateExercise, reorderTemplateExercises,
    deleteTemplate, getActiveWorkout, discardWorkout, updateTemplateExercise, setExerciseIncrement,
  } = useWorkoutStore();
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [existing, setExisting] = useState<WorkoutLog | null>(null);
  const [guard, setGuard] = useState(false);

  // Edit dialog state
  const [editing, setEditing] = useState<TemplateExercise | null>(null);
  const [sets, setSets] = useState('3');
  const [repMin, setRepMin] = useState('8');
  const [repMax, setRepMax] = useState('12');
  const [weight, setWeight] = useState('0');
  const [increment, setIncrement] = useState('2.5');

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

  const openEdit = (te: TemplateExercise) => {
    setEditing(te);
    setSets(String(te.targetSets ?? 3));
    setRepMin(String(te.targetRepMin ?? te.targetReps ?? 8));
    setRepMax(String(te.targetRepMax ?? te.targetReps ?? 12));
    setWeight(String(te.targetWeight ?? 0));
    setIncrement(String(effectiveIncrement(te.exercise?.weightIncrement, te.exercise?.equipment)));
  };

  const saveEdit = async () => {
    if (!editing) return;
    const min = Math.max(1, Math.round(parseFloat(repMin) || 1));
    let max = Math.max(min, Math.round(parseFloat(repMax) || min));
    await updateTemplateExercise(editing.id, {
      targetSets: Math.max(1, Math.round(parseFloat(sets) || 1)),
      targetRepMin: min,
      targetRepMax: max,
      targetReps: max,
      targetWeight: Math.max(0, parseFloat(weight) || 0),
    });
    const inc = parseFloat(increment);
    if (editing.exercise && inc > 0) await setExerciseIncrement(editing.exerciseId, inc);
    setEditing(null);
    refresh();
  };

  const handleRemove = async (teId: number) => {
    await removeTemplateExercise(teId);
    refresh();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= exercises.length) return;
    const ids = exercises.map(e => e.id);
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
    // Optimistic reorder so the list updates instantly.
    setExercises(prev => {
      const copy = [...prev];
      const t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
      return copy;
    });
    await reorderTemplateExercises(ids);
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

  const repLabel = (te: TemplateExercise) =>
    te.targetRepMin != null && te.targetRepMax != null
      ? `${te.targetRepMin}–${te.targetRepMax}`
      : `${te.targetReps}`;

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
            <Surface key={te.id} style={[styles.exRow, { backgroundColor: colors.surface }]} elevation={1}>
              <Text variant="titleSmall" style={styles.exIndex}>{i + 1}</Text>
              <Pressable style={styles.exInfo} onPress={() => openEdit(te)}>
                <Text variant="bodyLarge" style={{ color: colors.onSurface }}>{te.exercise?.name}</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {te.targetSets} sets × {repLabel(te)} reps
                  {te.targetWeight > 0 ? ` · ${te.targetWeight} kg` : ''}
                  {' · '}+{effectiveIncrement(te.exercise?.weightIncrement, te.exercise?.equipment)}
                </Text>
              </Pressable>
              <View style={styles.moveCol}>
                <IconButton icon="chevron-up" size={16} disabled={i === 0} style={styles.moveBtn} onPress={() => move(i, -1)} />
                <IconButton icon="chevron-down" size={16} disabled={i === exercises.length - 1} style={styles.moveBtn} onPress={() => move(i, 1)} />
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
        <View style={[styles.startBar, { backgroundColor: colors.surface, borderTopColor: colors.outline }]}>
          <Button mode="contained" icon="play" onPress={handleStart} style={styles.startBtn}>
            Start Workout
          </Button>
        </View>
      )}

      <Portal>
        <Dialog visible={!!editing} onDismiss={() => setEditing(null)}>
          <Dialog.Title>{editing?.exercise?.name}</Dialog.Title>
          <Dialog.Content>
            <Stepper label="Sets" value={sets} step={1} min={1} onChange={setSets} />
            <View style={styles.repRangeRow}>
              <View style={styles.repHalf}><Stepper label="Min reps" value={repMin} step={1} min={1} onChange={setRepMin} /></View>
            </View>
            <View style={styles.repRangeRow}>
              <View style={styles.repHalf}><Stepper label="Max reps" value={repMax} step={1} min={1} onChange={setRepMax} /></View>
            </View>
            <Stepper label="Working weight (kg)" value={weight} step={parseFloat(increment) || 2.5} min={0} onChange={setWeight} />
            <Stepper label="Weight jump (kg)" value={increment} step={0.5} min={0.5} onChange={setIncrement} />
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, marginTop: spacing.xs }}>
              The weight jump is used when auto-progressing this exercise once you hit the top of the rep range.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditing(null)}>Cancel</Button>
            <Button mode="contained" onPress={saveEdit}>Save</Button>
          </Dialog.Actions>
        </Dialog>

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
    gap: spacing.sm,
  },
  exIndex: { color: moduleColors.workout, fontWeight: '700', width: 20 },
  exInfo: { flex: 1 },
  moveCol: { justifyContent: 'center' },
  moveBtn: { margin: 0, height: 22 },
  addBtn: { marginTop: spacing.sm },
  startBar: { padding: spacing.md, borderTopWidth: 1 },
  startBtn: { borderRadius: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  stepBtn: { margin: 0 },
  stepInput: { width: 72, height: 40 },
  stepInputContent: { textAlign: 'center' },
  repRangeRow: { flexDirection: 'row' },
  repHalf: { flex: 1 },
});
