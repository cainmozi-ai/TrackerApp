import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, IconButton, Button, Portal, Dialog, Searchbar, TouchableRipple, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { RestTimer } from '@/components/workout/RestTimer';
import { SetKeypad, type SetEntry, type SetType } from '@/components/workout/SetKeypad';
import { PlateCalculator } from '@/components/workout/PlateCalculator';
import { useWorkoutStore, estimate1RM } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
import type { Exercise, WorkoutSet } from '@/types';

interface Target { repMin: number; repMax: number }

export default function ActiveWorkoutScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ workoutId?: string; templateId?: string; repeatOf?: string }>();
  const {
    activeSets, exercises, templates, loadTemplates, loadExercises, startWorkout, getActiveWorkout, discardWorkout, loadActiveSets,
    getTemplateExercises, getLastSets, getProgressionSuggestion, logSet, updateSet, removeSet, finishWorkout,
    getExerciseBest, getWorkoutDetail,
  } = useWorkoutStore();
  const { reward, profile, loadProfile } = useUserStore();

  const [wid, setWid] = useState<number | null>(params.workoutId ? Number(params.workoutId) : null);
  const [templateId, setTemplateId] = useState<number | null>(params.templateId ? Number(params.templateId) : null);
  const [displayed, setDisplayed] = useState<Exercise[]>([]);
  const [targets, setTargets] = useState<Record<number, Target>>({});
  const [previous, setPrevious] = useState<Record<number, WorkoutSet[]>>({});
  const [suggestion, setSuggestion] = useState<Record<number, { weight: number; reps: number } | null>>({});
  const [keypadFor, setKeypadFor] = useState<{ exId: number; name: string; initial: { weight: string; reps: string; rpe?: number | null; setType?: SetType }; editSetId?: number } | null>(null);
  const [plateFor, setPlateFor] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [restSignal, setRestSignal] = useState(0);
  const [discardVisible, setDiscardVisible] = useState(false);
  const [myGymOnly, setMyGymOnly] = useState(true);
  const [prSnack, setPrSnack] = useState('');
  // Exercise ids linked into a superset with the NEXT exercise in the list.
  const [links, setLinks] = useState<Record<number, boolean>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState('');

  const gymEquipment = profile?.equipment ?? [];
  const weightUnit = profile?.weightUnit ?? 'kg';

  // Elapsed session clock — starts when the workout row exists (first set or resume).
  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const m = Math.floor(s / 60);
      setElapsed(m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s % 60).padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  const parseDbTime = (s: string) => new Date(s.replace(' ', 'T') + 'Z').getTime();

  const applyTemplate = async (tplId: number) => {
    setTemplateId(tplId);
    const te = await getTemplateExercises(tplId);
    const tg: Record<number, Target> = {};
    const prev: Record<number, WorkoutSet[]> = {};
    const sug: Record<number, { weight: number; reps: number } | null> = {};
    const list: Exercise[] = [];
    for (const t of te) {
      if (t.exercise) list.push(t.exercise);
      const repMax = t.targetRepMax ?? t.targetReps ?? 10;
      const repMin = t.targetRepMin ?? Math.max(1, repMax - 3);
      tg[t.exerciseId] = { repMin, repMax };
      prev[t.exerciseId] = await getLastSets(t.exerciseId);
      sug[t.exerciseId] = await getProgressionSuggestion(t.exerciseId, repMax);
    }
    setDisplayed(d => [...d, ...list.filter(ex => !d.some(e => e.id === ex.id))]);
    setTargets(t => ({ ...t, ...tg }));
    setPrevious(p => ({ ...p, ...prev }));
    setSuggestion(s => ({ ...s, ...sug }));
  };

  useEffect(() => {
    (async () => {
      await loadProfile();
      await loadTemplates();
      let id: number | null = params.workoutId ? Number(params.workoutId) : null;
      const tplId: number | null = params.templateId ? Number(params.templateId) : null;

      // No explicit workout handed in? Resume the latest unfinished one if it exists.
      let resumedTpl: number | null = null;
      if (!id) {
        const active = await getActiveWorkout();
        if (active) {
          id = active.id;
          resumedTpl = active.templateId;
          setStartedAt(parseDbTime(active.startedAt));
        }
      } else {
        const active = await getActiveWorkout();
        if (active && active.id === id) setStartedAt(parseDbTime(active.startedAt));
      }

      if (id) {
        setWid(id);
        await loadActiveSets(id);
      }
      // else: lazy session — the workout row is created when the first set is logged.

      if (tplId || resumedTpl) await applyTemplate(tplId ?? resumedTpl!);

      // Repeat a past workout: preload its exercises (no template needed).
      if (params.repeatOf && !id) {
        const detail = await getWorkoutDetail(Number(params.repeatOf));
        if (detail) {
          const seen = new Set<number>();
          for (const s of detail.sets) {
            if (s.exercise && !seen.has(s.exercise.id)) {
              seen.add(s.exercise.id);
              await addExerciseToSessionAsync(s.exercise);
            }
          }
        }
      }

      // Merge in exercises that already have logged sets (resume case).
      const logged = useWorkoutStore.getState().activeSets;
      for (const s of logged) {
        if (s.exercise) await addExerciseToSessionAsync(s.exercise);
      }
    })();
  }, []);

  const addExerciseToSessionAsync = async (ex: Exercise) => {
    let added = false;
    setDisplayed(d => {
      if (d.some(e => e.id === ex.id)) return d;
      added = true;
      return [...d, ex];
    });
    setTargets(t => (t[ex.id] ? t : { ...t, [ex.id]: { repMin: 8, repMax: 12 } }));
    const prev = await getLastSets(ex.id);
    const sug = await getProgressionSuggestion(ex.id, 12);
    setPrevious(p => (p[ex.id] ? p : { ...p, [ex.id]: prev }));
    setSuggestion(s => (s[ex.id] !== undefined ? s : { ...s, [ex.id]: sug }));
    return added;
  };

  useEffect(() => {
    const filter = myGymOnly && gymEquipment.length > 0 ? gymEquipment : undefined;
    loadExercises('All', pickerSearch, filter);
  }, [pickerSearch, pickerVisible, myGymOnly, gymEquipment.join(',')]);

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

  const openEditSet = (s: WorkoutSet, name: string) => {
    setKeypadFor({
      exId: s.exerciseId,
      name,
      editSetId: s.id,
      initial: { weight: String(s.weight), reps: String(s.reps), rpe: s.rpe, setType: s.setType as SetType },
    });
  };

  const handleConfirm = async (entry: SetEntry) => {
    if (!keypadFor) return;
    const exId = keypadFor.exId;

    if (keypadFor.editSetId && wid) {
      await updateSet(keypadFor.editSetId, wid, entry.reps, entry.weight, entry.rpe ?? undefined, entry.setType);
      setKeypadFor(null);
      return;
    }

    // Create the workout row only now, on the first logged set (no empty orphans).
    let id = wid;
    if (!id) {
      id = await startWorkout(templateId ?? undefined, 'Quick Workout');
      setWid(id);
      setStartedAt(Date.now());
    }
    // All-time bests BEFORE this set lands, so we can celebrate PRs.
    const best = await getExerciseBest(exId, id);
    const existing = activeSets.filter(s => s.exerciseId === exId).length;
    await logSet(id, exId, existing + 1, entry.reps, entry.weight, entry.rpe ?? undefined, entry.setType);

    let announced = false;
    if (entry.setType !== 'warmup') {
      if (best.maxWeight > 0 && entry.weight > best.maxWeight) {
        setPrSnack(`🏆 New weight PR on ${keypadFor.name}: ${entry.weight} ${weightUnit}!`);
        announced = true;
      } else if (best.max1RM > 0 && estimate1RM(entry.weight, entry.reps) > best.max1RM) {
        setPrSnack(`🏆 New est. 1RM PR on ${keypadFor.name}!`);
        announced = true;
      }
    }

    // Superset: no rest between linked exercises — go straight to the partner.
    if (links[exId]) {
      const idx = displayed.findIndex(e => e.id === exId);
      const next = displayed[idx + 1];
      if (!announced && next) setPrSnack(`Superset — straight to ${next.name}, no rest`);
    } else {
      setRestSignal(s => s + 1);
    }
    setKeypadFor(null);
  };

  const toggleLink = (exId: number) => setLinks(l => ({ ...l, [exId]: !l[exId] }));
  const inSuperset = (idx: number) =>
    (displayed[idx] && links[displayed[idx].id]) || (idx > 0 && links[displayed[idx - 1].id]);

  const addExerciseToSession = (ex: Exercise) => {
    addExerciseToSessionAsync(ex);
    setPickerVisible(false);
    setPickerSearch('');
  };

  const handleFinish = async () => {
    if (!wid) return;
    await finishWorkout(wid);
    await reward(50, 'workout', 'Completed a workout', 'first_workout');
    router.dismissAll();
    router.replace(`/fitness/workout-summary?id=${wid}`);
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
        <Stat value={elapsed || '—'} label="Time" />
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
          const grouped = inSuperset(idx);
          return (
            <MotionCard key={ex.id} index={idx}
              style={[styles.exCard, grouped && { borderLeftWidth: 3, borderLeftColor: '#B388FF', marginBottom: links[ex.id] ? 2 : spacing.sm }]}>
              <View style={styles.exHead}>
                <Pressable style={styles.exTitleWrap} onPress={() => router.push(`/fitness/exercise-detail?id=${ex.id}`)}>
                  <View style={styles.exNameRow}>
                    <Text variant="titleMedium" style={[styles.exName, { color: colors.onSurface }]}>{ex.name}</Text>
                    <MaterialCommunityIcons name="information-outline" size={15} color={colors.onSurfaceVariant} />
                    {grouped && (
                      <View style={[styles.supersetBadge, { backgroundColor: withAlpha('#B388FF', 0.2) }]}>
                        <Text variant="labelSmall" style={{ color: '#B388FF', fontWeight: '700' }}>SUPERSET</Text>
                      </View>
                    )}
                  </View>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                    {ex.muscleGroup}{tgt ? ` · ${tgt.repMin}–${tgt.repMax} reps` : ''}
                  </Text>
                </Pressable>
                <IconButton icon="calculator-variant" size={20} iconColor={colors.onSurfaceVariant}
                  onPress={() => setPlateFor(sug?.weight ?? prev[0]?.weight ?? 60)} />
              </View>

              <Text variant="labelSmall" style={[styles.prevLine, { color: colors.onSurfaceVariant }]}>
                {prev.length ? `Last: ${prev.map(p => `${p.weight}×${p.reps}`).join(', ')}` : 'No history yet'}
              </Text>

              {sets.map((s, i) => (
                <Pressable key={s.id} style={styles.setRow} onPress={() => openEditSet(s, ex.name)}>
                  <View style={[styles.typeDot, { backgroundColor: typeColor(s.setType) }]} />
                  <Text variant="bodyMedium" style={[styles.setNum, { color: colors.onSurfaceVariant }]}>Set {i + 1}</Text>
                  <Text variant="bodyMedium" style={[styles.setData, { color: colors.onSurface }]}>
                    {s.weight} {weightUnit} × {s.reps}{s.rpe != null ? ` · ${s.rpe} RIR` : ''}
                  </Text>
                  <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.onSurfaceVariant} />
                  <IconButton icon="close" size={16} onPress={() => wid && removeSet(s.id, wid)} />
                </Pressable>
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
        }).flatMap((card, idx) => {
          // Insert a superset link toggle between consecutive exercise cards.
          if (idx >= displayed.length - 1) return [card];
          const exId = displayed[idx].id;
          return [card, (
            <Pressable key={`link-${exId}`} onPress={() => toggleLink(exId)}
              style={[styles.linkToggle, links[exId] && { backgroundColor: withAlpha('#B388FF', 0.16) }]}>
              <MaterialCommunityIcons name={links[exId] ? 'link-variant' : 'link-variant-plus'}
                size={14} color={links[exId] ? '#B388FF' : colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: links[exId] ? '#B388FF' : colors.onSurfaceVariant }}>
                {links[exId] ? 'Superset linked' : 'Link as superset'}
              </Text>
            </Pressable>
          )];
        })}

        {displayed.length === 0 && templates.length > 0 && (
          <View style={styles.quickStart}>
            <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700', marginBottom: spacing.xs }}>
              Start from a routine
            </Text>
            {templates.slice(0, 6).map(t => (
              <Pressable key={t.id} onPress={() => applyTemplate(t.id)}
                style={[styles.routineRow, { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons name="clipboard-list" size={20} color={accent} />
                <View style={styles.routineInfo}>
                  <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>{t.name}</Text>
                  {!!t.description && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t.description}</Text>}
                </View>
                <MaterialCommunityIcons name="play-circle" size={22} color={accent} />
              </Pressable>
            ))}
          </View>
        )}

        <Button mode="outlined" icon="plus" style={styles.addExBtn} onPress={() => setPickerVisible(true)}>
          {displayed.length === 0 ? 'Or add exercises one by one' : 'Add Exercise'}
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
          weightUnit={weightUnit}
          confirmLabel={keypadFor.editSetId ? 'Save changes' : 'Log set'}
          onConfirm={handleConfirm}
          onDismiss={() => setKeypadFor(null)}
        />
      )}
      <PlateCalculator visible={plateFor !== null} totalWeight={plateFor ?? 0} unit={weightUnit} onDismiss={() => setPlateFor(null)} />

      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)} style={styles.pickerDialog}>
          <Dialog.Title>Add Exercise</Dialog.Title>
          <Dialog.Content>
            <Searchbar placeholder="Search..." value={pickerSearch} onChangeText={setPickerSearch} style={styles.pickerSearch} />
            {gymEquipment.length > 0 && (
              <Pressable onPress={() => setMyGymOnly(v => !v)} style={[styles.gymToggle, { backgroundColor: withAlpha(accent, myGymOnly ? 0.16 : 0.06) }]}>
                <MaterialCommunityIcons name={myGymOnly ? 'check-circle' : 'circle-outline'} size={16} color={accent} />
                <Text variant="labelMedium" style={{ color: accent }}>My gym's equipment only</Text>
              </Pressable>
            )}
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

      <Snackbar visible={!!prSnack} onDismiss={() => setPrSnack('')} duration={3500}>{prSnack}</Snackbar>
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
  exNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exName: { fontWeight: '700' },
  gymToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: shape.pill, marginBottom: spacing.sm },
  prevLine: { marginTop: 2, marginBottom: spacing.xs },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  typeDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  setNum: { width: 52 },
  setData: { flex: 1, fontWeight: '600' },
  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: shape.pill, marginTop: spacing.xs },
  addSetBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  addExBtn: { marginTop: spacing.sm },
  quickStart: { marginTop: spacing.sm },
  supersetBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  linkToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: shape.pill, marginBottom: spacing.sm, marginTop: -2 },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: shape.md, marginBottom: spacing.xs },
  routineInfo: { flex: 1 },
  finishBar: { padding: spacing.md, borderTopWidth: 1 },
  finishBtn: { borderRadius: shape.pill },
  pickerDialog: { maxHeight: '80%' },
  pickerSearch: { marginBottom: spacing.sm },
  pickerList: { maxHeight: 320 },
  pickerItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
});
