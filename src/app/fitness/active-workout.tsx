import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, IconButton, Button, Portal, Dialog, Searchbar, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { RestTimer } from '@/components/workout/RestTimer';
import { SetKeypad, type SetEntry } from '@/components/workout/SetKeypad';
import { PlateCalculator } from '@/components/workout/PlateCalculator';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
import type { Exercise, WorkoutSet } from '@/types';

interface Target { repMin: number; repMax: number }

export default function ActiveWorkoutScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ workoutId?: string; templateId?: string }>();
  const {
    activeSets, exercises, loadExercises, startWorkout, getActiveWorkout, discardWorkout, loadActiveSets,
    getTemplateExercises, getLastSets, getProgressionSuggestion, logSet, removeSet, finishWorkout,
  } = useWorkoutStore();
  const { reward } = useUserStore();

  const [wid, setWid] = useState<number | null>(params.workoutId ? Number(params.workoutId) : null);
  const [templateId, setTemplateId] = useState<number | null>(params.templateId ? Number(params.templateId) : null);
  const [displayed, setDisplayed] = useState<Exercise[]>([]);
  const [targets, setTargets] = useState<Record<number, Target>>({});
  const [previous, setPrevious] = useState<Record<number, WorkoutSet[]>>({});
  const [suggestion, setSuggestion] = useState<Record<number, { weight: number; reps: number } | null>>({});
  const [keypadFor, setKeypadFor] = useState<{ exId: number; name: string; initial: { weight: string; reps: string } } | null>(null);
  const [plateFor, setPlateFor] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [restSignal, setRestSignal] = useState(0);
  const [discardVisible, setDiscardVisible] = useState(false);

  useEffect(() => {
    (async () => {
      let id: number | null = params.workoutId ? Number(params.workoutId) : null;
      let tplId: number | null = params.templateId ? Number(params.templateId) : null;

      // No explicit workout handed in? Resume the latest unfinished one if it exists.
      if (!id) {
        const active = await getActiveWorkout();
        if (active) {
          id = active.id;
          tplId = active.templateId ?? tplId;
        }
      }

      if (id) {
        setWid(id);
        await loadActiveSets(id);
      }
      // else: lazy session — the workout row is created when the first set is logged.
      setTemplateId(tplId);

      const tg: Record<number, Target> = {};
      const prev: Record<number, WorkoutSet[]> = {};
      const sug: Record<number, { weight: number; reps: number } | null> = {};
      const list: Exercise[] = [];

      if (tplId) {
        const te = await getTemplateExercises(tplId);
        for (const t of te) {
          if (t.exercise) list.push(t.exercise);
          const repMax = t.targetRepMax ?? t.targetReps ?? 10;
          const repMin = t.targetRepMin ?? Math.max(1, repMax - 3);
          tg[t.exerciseId] = { repMin, repMax };
          prev[t.exerciseId] = await getLastSets(t.exerciseId);
          sug[t.exerciseId] = await getProgressionSuggestion(t.exerciseId, repMax);
        }
      }

      // Merge in exercises that already have logged sets (resume case).
      const logged = useWorkoutStore.getState().activeSets;
      for (const s of logged) {
        if (s.exercise && !list.some(e => e.id === s.exercise!.id)) {
          list.push(s.exercise);
          if (!tg[s.exercise.id]) {
            tg[s.exercise.id] = { repMin: 8, repMax: 12 };
            prev[s.exercise.id] = await getLastSets(s.exercise.id);
            sug[s.exercise.id] = await getProgressionSuggestion(s.exercise.id, 12);
          }
        }
      }

      setDisplayed(list);
      setTargets(tg);
      setPrevious(prev);
      setSuggestion(sug);
    })();
  }, []);

  useEffect(() => { loadExercises('All', pickerSearch); }, [pickerSearch, pickerVisible]);

  const openKeypad = (ex: Exercise) => {
    const sug = suggestion[ex.id];
    const lastForEx = activeSets.filter(s => s.exerciseId === ex.id).slice(-1)[0];
    const repMax = targets[ex.id]?.repMax;
    setKeypadFor({
      exId: ex.id,
      name: ex.name,
      initial: {
        weight: sug ? String(sug.weight) : (lastForEx ? String(lastForEx.weight) : ''),
        reps: sug ? String(sug.reps) : (lastForEx ? String(lastForEx.reps) : (repMax ? String(repMax) : '')),
      },
    });
  };

  const handleConfirm = async (entry: SetEntry) => {
    if (!keypadFor) return;
    // Create the workout row only now, on the first logged set (no empty orphans).
    let id = wid;
    if (!id) {
      id = await startWorkout(templateId ?? undefined, 'Quick Workout');
      setWid(id);
    }
    const exId = keypadFor.exId;
    const existing = activeSets.filter(s => s.exerciseId === exId).length;
    await logSet(id, exId, existing + 1, entry.reps, entry.weight, entry.rpe ?? undefined, entry.setType);
    setRestSignal(s => s + 1);
    setKeypadFor(null);
  };

  const addExerciseToSession = (ex: Exercise) => {
    if (!displayed.some(e => e.id === ex.id)) {
      setDisplayed(prev => [...prev, ex]);
      setTargets(t => ({ ...t, [ex.id]: { repMin: 8, repMax: 12 } }));
      getLastSets(ex.id).then(p => setPrevious(prev => ({ ...prev, [ex.id]: p })));
    }
    setPickerVisible(false);
    setPickerSearch('');
  };

  const handleFinish = async () => {
    if (!wid) return;
    await finishWorkout(wid);
    await reward(50, 'workout', 'Completed a workout', 'first_workout');
    router.dismissAll();
    router.replace('/(tabs)/fitness');
  };

  const handleDiscard = async () => {
    setDiscardVisible(false);
    if (wid) await discardWorkout(wid);
    router.back();
  };

  const typeColor = (t: string) =>
    t === 'failure' ? colors.error : t === 'warmup' ? '#5AA9E6' : t === 'drop' ? accent : colors.onSurfaceVariant;

  const totalSets = activeSets.length;
  const totalVolume = activeSets.reduce((s, set) => s + set.weight * set.reps, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title="Active Workout"
        right={(wid !== null || totalSets > 0)
          ? <IconButton icon="trash-can-outline" iconColor={colors.onSurfaceVariant} onPress={() => setDiscardVisible(true)} />
          : undefined}
      />

      <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
        <Stat value={String(displayed.length)} label="Exercises" />
        <Stat value={String(totalSets)} label="Sets" />
        <Stat value={String(Math.round(totalVolume))} label="Volume" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <RestTimer defaultSeconds={90} autoStartSignal={restSignal} />

        {displayed.map((ex, idx) => {
          const sets = activeSets.filter(s => s.exerciseId === ex.id);
          const prev = previous[ex.id] || [];
          const sug = suggestion[ex.id];
          const tgt = targets[ex.id];
          return (
            <MotionCard key={ex.id} index={idx} style={styles.exCard}>
              <View style={styles.exHead}>
                <View style={styles.exTitleWrap}>
                  <Text variant="titleMedium" style={[styles.exName, { color: colors.onSurface }]}>{ex.name}</Text>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                    {ex.muscleGroup}{tgt ? ` · ${tgt.repMin}–${tgt.repMax} reps` : ''}
                  </Text>
                </View>
                <IconButton icon="calculator-variant" size={20} iconColor={colors.onSurfaceVariant}
                  onPress={() => setPlateFor(sug?.weight ?? prev[0]?.weight ?? 60)} />
              </View>

              <Text variant="labelSmall" style={[styles.prevLine, { color: colors.onSurfaceVariant }]}>
                {prev.length ? `Last: ${prev.map(p => `${p.weight}×${p.reps}`).join(', ')}` : 'No history yet'}
              </Text>

              {sets.map((s, i) => (
                <View key={s.id} style={styles.setRow}>
                  <View style={[styles.typeDot, { backgroundColor: typeColor(s.setType) }]} />
                  <Text variant="bodyMedium" style={[styles.setNum, { color: colors.onSurfaceVariant }]}>Set {i + 1}</Text>
                  <Text variant="bodyMedium" style={[styles.setData, { color: colors.onSurface }]}>{s.weight} kg × {s.reps}{s.rpe != null ? ` · ${s.rpe} RIR` : ''}</Text>
                  <IconButton icon="close" size={16} onPress={() => wid && removeSet(s.id, wid)} />
                </View>
              ))}

              {!!sug && (
                <Pressable onPress={() => openKeypad(ex)} style={[styles.suggestChip, { backgroundColor: withAlpha(accent, 0.16) }]}>
                  <MaterialCommunityIcons name="trending-up" size={15} color={accent} />
                  <Text variant="labelMedium" style={{ color: accent, fontWeight: '700' }}>
                    Suggested: {sug.weight}kg × {sug.reps}
                  </Text>
                </Pressable>
              )}

              <Button mode="contained-tonal" icon="plus" onPress={() => openKeypad(ex)} style={styles.addSetBtn}>
                Add set
              </Button>
            </MotionCard>
          );
        })}

        <Button mode="outlined" icon="plus" style={styles.addExBtn} onPress={() => setPickerVisible(true)}>
          Add Exercise
        </Button>
      </ScrollView>

      <View style={[styles.finishBar, { backgroundColor: colors.surface, borderTopColor: colors.outline }]}>
        <Button mode="contained" icon="check" onPress={handleFinish} style={styles.finishBtn} buttonColor={accent} disabled={totalSets === 0}>
          Finish Workout
        </Button>
      </View>

      {keypadFor && (
        <SetKeypad
          visible
          exerciseName={keypadFor.name}
          initial={keypadFor.initial}
          onConfirm={handleConfirm}
          onDismiss={() => setKeypadFor(null)}
        />
      )}
      <PlateCalculator visible={plateFor !== null} totalWeight={plateFor ?? 0} onDismiss={() => setPlateFor(null)} />

      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)} style={styles.pickerDialog}>
          <Dialog.Title>Add Exercise</Dialog.Title>
          <Dialog.Content>
            <Searchbar placeholder="Search..." value={pickerSearch} onChangeText={setPickerSearch} style={styles.pickerSearch} />
            <ScrollView style={styles.pickerList}>
              {exercises.slice(0, 40).map(ex => (
                <TouchableRipple key={ex.id} onPress={() => addExerciseToSession(ex)} style={styles.pickerItem}>
                  <View>
                    <Text variant="bodyLarge" style={{ color: colors.onSurface }}>{ex.name}</Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{ex.muscleGroup} · {ex.equipment}</Text>
                  </View>
                </TouchableRipple>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions><Button onPress={() => setPickerVisible(false)}>Done</Button></Dialog.Actions>
        </Dialog>

        <Dialog visible={discardVisible} onDismiss={() => setDiscardVisible(false)}>
          <Dialog.Title>Discard workout?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              This deletes the current workout and all its logged sets. To keep it, just go back — it stays in progress and you can resume it later.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDiscardVisible(false)}>Cancel</Button>
            <Button textColor={colors.error} onPress={handleDiscard}>Discard</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.stat}>
      <Text variant="titleMedium" style={{ color: accent, fontWeight: '800' }}>{value}</Text>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: shape.md },
  stat: { alignItems: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  exCard: { marginBottom: spacing.sm },
  exHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  exTitleWrap: { flex: 1 },
  exName: { fontWeight: '700' },
  prevLine: { marginTop: 2, marginBottom: spacing.xs },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  typeDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  setNum: { width: 52 },
  setData: { flex: 1, fontWeight: '600' },
  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: shape.pill, marginTop: spacing.xs },
  addSetBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  addExBtn: { marginTop: spacing.sm },
  finishBar: { padding: spacing.md, borderTopWidth: 1 },
  finishBtn: { borderRadius: shape.pill },
  pickerDialog: { maxHeight: '80%' },
  pickerSearch: { marginBottom: spacing.sm },
  pickerList: { maxHeight: 320 },
  pickerItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
});
