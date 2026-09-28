import { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, IconButton, Button, Portal, Dialog, Searchbar, TouchableRipple, Snackbar, Menu } from 'react-native-paper';
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
import { type LogType, formatSet, formatSetCompact } from '@/utils/workout';
import { formatMuscles, mechanicLabel, recommendedRest, formatRest } from '@/utils/muscles';
import { CIRCUITS, type CircuitPreset } from '@/data/circuits';
import type { Exercise, WorkoutSet } from '@/types';

/** A routine's plan for one exercise: how many sets, and the rep range. */
interface Target { repMin: number; repMax: number; sets: number }

/** Recommended rest for an exercise (seconds) — short breather for timed moves,
 * otherwise derived from its compound/isolation classification. */
function restFor(ex: Exercise): number {
  const lt = ex.logType || 'weight_reps';
  if (lt === 'cardio' || lt === 'duration') return 60;
  return recommendedRest(ex.mechanic, ex.region);
}

/** Sub-label under an exercise name, appropriate to how it's measured. */
function repTarget(ex: Exercise, tgt?: Target): string {
  const lt = ex.logType || 'weight_reps';
  if (lt === 'duration') return ' · timed';
  if (lt === 'cardio') return ' · distance & time';
  return tgt ? ` · ${tgt.repMin}–${tgt.repMax} reps` : '';
}

export default function ActiveWorkoutScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ workoutId?: string; templateId?: string; repeatOf?: string; exerciseId?: string }>();
  const {
    activeSets, exercises, templates, loadTemplates, loadExercises, startWorkout, getActiveWorkout, discardWorkout, loadActiveSets,
    getTemplateExercises, getLastSets, getProgressionSuggestion, logSet, updateSet, removeSet, finishWorkout,
    getExerciseBest, getWorkoutDetail, findExercisesByNames, getExerciseById, applyProgressionToTemplate,
  } = useWorkoutStore();
  const { reward, profile, loadProfile } = useUserStore();

  const [wid, setWid] = useState<number | null>(params.workoutId ? Number(params.workoutId) : null);
  const [templateId, setTemplateId] = useState<number | null>(params.templateId ? Number(params.templateId) : null);
  const [displayed, setDisplayed] = useState<Exercise[]>([]);
  const [targets, setTargets] = useState<Record<number, Target>>({});
  const [previous, setPrevious] = useState<Record<number, WorkoutSet[]>>({});
  const [best, setBest] = useState<Record<number, { maxWeight: number; max1RM: number }>>({});
  const [suggestion, setSuggestion] = useState<Record<number, { weight: number; reps: number } | null>>({});
  // Exercise id → its template_exercises row id, so we can write progression back to the routine.
  const [teByExercise, setTeByExercise] = useState<Record<number, number>>({});
  const [appliedTe, setAppliedTe] = useState<Record<number, boolean>>({});
  const [keypadFor, setKeypadFor] = useState<{ exId: number; name: string; logType: LogType; initial: { weight?: string; reps?: string; durationSeconds?: number; distance?: string; rpe?: number | null; setType?: SetType }; editSetId?: number } | null>(null);
  const [plateFor, setPlateFor] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [circuitVisible, setCircuitVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [restSignal, setRestSignal] = useState(0);
  const [restSeconds, setRestSeconds] = useState(90);
  const [discardVisible, setDiscardVisible] = useState(false);
  const [finishVisible, setFinishVisible] = useState(false);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Exercise | null>(null);
  // Name for sessions not started from a routine (a repeated workout, a cardio quick-start, a resume).
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [myGymOnly, setMyGymOnly] = useState(true);
  const [prSnack, setPrSnack] = useState('');
  const [undoSet, setUndoSet] = useState<WorkoutSet | null>(null);
  // One set at a time — two quick taps must not create two workouts.
  const committing = useRef(false);
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
      const pad = (n: number) => String(n).padStart(2, '0');
      setElapsed(`${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  const parseDbTime = (s: string) => new Date(s.replace(' ', 'T')).getTime();

  const applyTemplate = async (tplId: number) => {
    setTemplateId(tplId);
    const te = await getTemplateExercises(tplId);
    const tg: Record<number, Target> = {};
    const prev: Record<number, WorkoutSet[]> = {};
    const sug: Record<number, { weight: number; reps: number } | null> = {};
    const bst: Record<number, { maxWeight: number; max1RM: number }> = {};
    const teMap: Record<number, number> = {};
    const list: Exercise[] = [];
    for (const t of te) {
      if (t.exercise) list.push(t.exercise);
      const repMax = t.targetRepMax ?? t.targetReps ?? 10;
      const repMin = t.targetRepMin ?? Math.max(1, repMax - 3);
      tg[t.exerciseId] = { repMin, repMax, sets: Math.max(1, t.targetSets ?? 3) };
      teMap[t.exerciseId] = t.id;
      prev[t.exerciseId] = await getLastSets(t.exerciseId);
      sug[t.exerciseId] = await getProgressionSuggestion(t.exerciseId, repMax);
      bst[t.exerciseId] = await getExerciseBest(t.exerciseId);
    }
    setDisplayed(d => [...d, ...list.filter(ex => !d.some(e => e.id === ex.id))]);
    setTargets(t => ({ ...t, ...tg }));
    setPrevious(p => ({ ...p, ...prev }));
    setSuggestion(s => ({ ...s, ...sug }));
    setBest(b => ({ ...b, ...bst }));
    setTeByExercise(m => ({ ...m, ...teMap }));
  };

  const applyToRoutine = async (ex: Exercise) => {
    const teId = teByExercise[ex.id];
    const sug = suggestion[ex.id];
    if (!teId || !sug) return;
    await applyProgressionToTemplate(teId, sug.weight, targets[ex.id]?.repMin);
    setAppliedTe(a => ({ ...a, [ex.id]: true }));
    setPrSnack(`Routine updated: ${ex.name} → ${sug.weight}${weightUnit}`);
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
          setSessionName(active.name);
        }
      } else {
        const active = await getActiveWorkout();
        if (active && active.id === id) {
          setStartedAt(parseDbTime(active.startedAt));
          setSessionName(active.name);
        }
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
          setSessionName(detail.workout.name);
          const seen = new Set<number>();
          for (const s of detail.sets) {
            if (s.exercise && !seen.has(s.exercise.id)) {
              seen.add(s.exercise.id);
              await addExerciseToSessionAsync(s.exercise);
            }
          }
        }
      }

      // Pre-load a single exercise (e.g. from the Cardio quick-start).
      if (params.exerciseId && !id) {
        const ex = await getExerciseById(Number(params.exerciseId));
        if (ex) {
          setSessionName(ex.name);
          await addExerciseToSessionAsync(ex);
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
    const timed = ex.logType === 'cardio' || ex.logType === 'duration';
    setTargets(t => (t[ex.id] ? t : { ...t, [ex.id]: { repMin: 8, repMax: 12, sets: timed ? 1 : 3 } }));
    const prev = await getLastSets(ex.id);
    const sug = await getProgressionSuggestion(ex.id, 12);
    const b = await getExerciseBest(ex.id);
    setPrevious(p => (p[ex.id] ? p : { ...p, [ex.id]: prev }));
    setSuggestion(s => (s[ex.id] !== undefined ? s : { ...s, [ex.id]: sug }));
    setBest(bs => (bs[ex.id] ? bs : { ...bs, [ex.id]: b }));
    return added;
  };

  useEffect(() => {
    const filter = myGymOnly && gymEquipment.length > 0 ? gymEquipment : undefined;
    loadExercises('All', pickerSearch, filter);
  }, [pickerSearch, pickerVisible, myGymOnly, gymEquipment.join(',')]);

  /** What planned set `i` should pre-fill: the progression suggestion, else
   * the same set last time, else this session's latest set, else the top of
   * the rep range. Weight stays undefined when there's nothing to go on. */
  const plannedFor = (ex: Exercise, i: number): { weight?: number; reps?: number } => {
    const sug = (ex.logType || 'weight_reps') === 'weight_reps' ? suggestion[ex.id] : null;
    if (sug) return { weight: sug.weight, reps: sug.reps };
    const prevSet = (previous[ex.id] || [])[i];
    if (prevSet) return { weight: prevSet.weight, reps: prevSet.reps };
    const last = activeSets.filter(s => s.exerciseId === ex.id).slice(-1)[0];
    if (last) return { weight: last.weight, reps: last.reps };
    return { reps: targets[ex.id]?.repMax };
  };

  const openKeypad = (ex: Exercise, i?: number) => {
    const logType = (ex.logType || 'weight_reps') as LogType;
    const index = i ?? activeSets.filter(s => s.exerciseId === ex.id).length;
    const plan = plannedFor(ex, index);
    const prevSet = (previous[ex.id] || [])[index] ?? (previous[ex.id] || []).slice(-1)[0];
    setKeypadFor({
      exId: ex.id,
      name: ex.name,
      logType,
      initial: {
        weight: plan.weight != null ? String(plan.weight) : '',
        reps: plan.reps != null ? String(plan.reps) : '',
        durationSeconds: prevSet?.durationSeconds ?? 0,
        distance: prevSet?.distance ? String(prevSet.distance) : '',
      },
    });
  };

  /** Tapping a planned row's tick box logs it as planned; if the plan is
   * incomplete (no weight yet, or a timed move) it opens the keypad instead. */
  const quickLog = async (ex: Exercise, i: number) => {
    const logType = (ex.logType || 'weight_reps') as LogType;
    const plan = plannedFor(ex, i);
    const ready = (logType === 'weight_reps' && !!plan.weight && !!plan.reps)
      || (logType === 'bodyweight' && !!plan.reps);
    if (!ready) { openKeypad(ex, i); return; }
    await commitSet(ex.id, ex.name, {
      weight: plan.weight ?? 0, reps: plan.reps ?? 0, durationSeconds: 0, distance: 0, rpe: null, setType: 'normal',
    });
  };

  const openEditSet = (s: WorkoutSet, ex: Exercise) => {
    setKeypadFor({
      exId: s.exerciseId,
      name: ex.name,
      logType: (ex.logType || 'weight_reps') as LogType,
      editSetId: s.id,
      initial: {
        weight: String(s.weight),
        reps: String(s.reps),
        durationSeconds: s.durationSeconds,
        distance: s.distance ? String(s.distance) : '',
        rpe: s.rpe,
        setType: s.setType as SetType,
      },
    });
  };

  const handleConfirm = async (entry: SetEntry) => {
    if (!keypadFor) return;
    const exId = keypadFor.exId;

    const values = {
      reps: entry.reps,
      weight: entry.weight,
      durationSeconds: entry.durationSeconds,
      distance: entry.distance,
      rpe: entry.rpe ?? undefined,
    };

    if (keypadFor.editSetId && wid) {
      await updateSet(keypadFor.editSetId, wid, values, entry.setType);
      setKeypadFor(null);
      return;
    }
    await commitSet(exId, keypadFor.name, entry);
    setKeypadFor(null);
  };

  /** Log a new set: creates the workout on the first set, celebrates PRs and
   * starts the rest timer (or points at the superset partner). */
  const commitSet = async (exId: number, exName: string, entry: SetEntry) => {
    if (committing.current) return;
    committing.current = true;
    try {
      await logNewSet(exId, exName, entry);
    } finally {
      committing.current = false;
    }
  };

  const logNewSet = async (exId: number, exName: string, entry: SetEntry) => {
    const values = {
      reps: entry.reps,
      weight: entry.weight,
      durationSeconds: entry.durationSeconds,
      distance: entry.distance,
      rpe: entry.rpe ?? undefined,
    };

    // Create the workout row only now, on the first logged set (no empty orphans).
    let id = wid;
    if (!id) {
      id = await startWorkout(templateId ?? undefined, workoutName);
      setWid(id);
      setStartedAt(Date.now());
    }
    // All-time bests BEFORE this set lands, so we can celebrate PRs.
    const best = await getExerciseBest(exId, id);
    const existing = activeSets.filter(s => s.exerciseId === exId).length;
    await logSet(id, exId, existing + 1, values, entry.setType);

    let announced = false;
    if (entry.setType !== 'warmup') {
      if (best.maxWeight > 0 && entry.weight > best.maxWeight) {
        setPrSnack(`🏆 New weight PR on ${exName}: ${entry.weight} ${weightUnit}!`);
        announced = true;
      } else if (best.max1RM > 0 && estimate1RM(entry.weight, entry.reps) > best.max1RM) {
        setPrSnack(`🏆 New est. 1RM PR on ${exName}!`);
        announced = true;
      }
    }

    // Superset: no rest between linked exercises — go straight to the partner.
    if (links[exId]) {
      const idx = displayed.findIndex(e => e.id === exId);
      const next = displayed[idx + 1];
      if (!announced && next) setPrSnack(`Superset — straight to ${next.name}, no rest`);
    } else {
      // Start the rest timer at this exercise's recommended rest.
      const ex = displayed.find(e => e.id === exId);
      if (ex) setRestSeconds(restFor(ex));
      setRestSignal(s => s + 1);
    }
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    setDisplayed(d => {
      const j = idx + dir;
      if (j < 0 || j >= d.length) return d;
      const copy = [...d];
      const tmp = copy[idx];
      copy[idx] = copy[j];
      copy[j] = tmp;
      return copy;
    });
  };

  const toggleLink = (exId: number) => setLinks(l => ({ ...l, [exId]: !l[exId] }));
  const inSuperset = (idx: number) =>
    (displayed[idx] && links[displayed[idx].id]) || (idx > 0 && links[displayed[idx - 1].id]);

  // Label a linked run: 3+ exercises reads as a CIRCUIT, 2 as a SUPERSET.
  const groupLabel = (idx: number) => {
    let start = idx;
    while (start > 0 && links[displayed[start - 1].id]) start--;
    let end = start;
    while (end < displayed.length - 1 && links[displayed[end].id]) end++;
    return end - start + 1 >= 3 ? 'CIRCUIT' : 'SUPERSET';
  };

  const handleAddCircuit = async (c: CircuitPreset) => {
    const exs = await findExercisesByNames(c.exercises);
    const newIds: number[] = [];
    for (const ex of exs) {
      const added = await addExerciseToSessionAsync(ex);
      if (added) newIds.push(ex.id);
    }
    setLinks(l => {
      const nl = { ...l };
      for (let i = 0; i < newIds.length - 1; i++) nl[newIds[i]] = true;
      return nl;
    });
    setCircuitVisible(false);
    if (newIds.length) setPrSnack(`Added ${c.name} — ${newIds.length} moves linked as a circuit`);
  };

  const addExerciseToSession = (ex: Exercise) => {
    addExerciseToSessionAsync(ex);
    setPickerVisible(false);
    setPickerSearch('');
  };

  const handleFinish = async () => {
    setFinishVisible(false);
    if (!wid) return;
    await finishWorkout(wid);
    // Measure the XP/level change so the summary can celebrate it.
    const before = useUserStore.getState().profile;
    await reward(50, 'workout', 'Completed a workout', 'first_workout');
    const after = useUserStore.getState().profile;
    const xpGained = Math.max(0, (after?.xp ?? 0) - (before?.xp ?? 0));
    const levelUp = after && before && after.level > before.level ? `&levelUp=${after.level}` : '';
    router.dismissAll();
    router.replace(`/fitness/workout-summary?id=${wid}&xp=${xpGained}${levelUp}`);
  };

  const handleDeleteSet = async () => {
    if (!keypadFor?.editSetId || !wid) return;
    const deleted = activeSets.find(s => s.id === keypadFor.editSetId) ?? null;
    await removeSet(keypadFor.editSetId, wid);
    setKeypadFor(null);
    setUndoSet(deleted);
  };

  const handleUndoDelete = async () => {
    if (!undoSet || !wid) return;
    const s = undoSet;
    setUndoSet(null);
    await logSet(wid, s.exerciseId, s.setNumber, {
      reps: s.reps, weight: s.weight, durationSeconds: s.durationSeconds, distance: s.distance, rpe: s.rpe ?? undefined,
    }, s.setType);
  };

  /** Take an exercise out of this session, deleting any sets already logged for it. */
  const removeExercise = async (ex: Exercise) => {
    setRemoveTarget(null);
    if (wid) {
      for (const s of activeSets.filter(x => x.exerciseId === ex.id)) await removeSet(s.id, wid);
    }
    const idx = displayed.findIndex(e => e.id === ex.id);
    setLinks(l => {
      const nl = { ...l };
      // A superset partner that pointed at this exercise shouldn't jump to the next one.
      if (idx > 0 && !nl[ex.id]) delete nl[displayed[idx - 1].id];
      delete nl[ex.id];
      return nl;
    });
    setDisplayed(d => d.filter(e => e.id !== ex.id));
  };

  const askRemoveExercise = (ex: Exercise) => {
    setMenuFor(null);
    if (activeSets.some(s => s.exerciseId === ex.id)) setRemoveTarget(ex);
    else removeExercise(ex);
  };

  const handleDiscard = async () => {
    setDiscardVisible(false);
    if (wid) await discardWorkout(wid);
    router.back();
  };

  const typeColor = (t: string) =>
    t === 'failure' ? colors.error
      : t === 'warmup' ? '#A83232'
      : t === 'drop' ? accent
      : t === 'assisted' ? '#66BB6A'
      : t === 'partial' ? '#FFA726'
      : t === 'static' ? '#A83232'
      : accent;

  const totalSets = activeSets.length;
  const workoutName = (templateId && templates.find(t => t.id === templateId)?.name) || sessionName || 'Quick Workout';
  const loggedIds = new Set(activeSets.map(s => s.exerciseId));
  const skipped = displayed.filter(e => !loggedIds.has(e.id));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        align="left"
        title={workoutName}
        subtitle={elapsed || '00:00:00'}
        right={
          <Button mode="contained" compact buttonColor={accent} textColor="#FFFFFF" style={styles.headerFinish}
            onPress={() => setFinishVisible(true)} disabled={totalSets === 0}>
            Finish
          </Button>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <RestTimer defaultSeconds={restSeconds} autoStartSignal={restSignal} />

        {displayed.map((ex, idx) => {
          const sets = activeSets.filter(s => s.exerciseId === ex.id);
          const prev = previous[ex.id] || [];
          const sug = suggestion[ex.id];
          const tgt = targets[ex.id];
          const grouped = inSuperset(idx);
          return (
            <MotionCard key={ex.id} index={idx}
              style={[styles.exCard, grouped && { borderLeftWidth: 3, borderLeftColor: '#A83232', marginBottom: links[ex.id] ? 2 : spacing.sm }]}>
              <View style={styles.exHead}>
                <Pressable style={styles.exTitleWrap} onPress={() => router.push(`/fitness/exercise-detail?id=${ex.id}`)}>
                  <View style={styles.exNameRow}>
                    <Text variant="titleMedium" style={[styles.exName, { color: colors.onSurface }]}>{ex.name}</Text>
                    {grouped && (
                      <View style={[styles.supersetBadge, { backgroundColor: withAlpha('#A83232', 0.2) }]}>
                        <Text variant="labelSmall" style={{ color: colors.accentText, fontWeight: '300' }}>{groupLabel(idx)}</Text>
                      </View>
                    )}
                  </View>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                    {ex.target || ex.muscleGroup}{repTarget(ex, tgt)}
                  </Text>
                </Pressable>
                <Menu
                  visible={menuFor === ex.id}
                  onDismiss={() => setMenuFor(null)}
                  anchor={
                    <IconButton icon="dots-vertical" size={20} iconColor={colors.onSurfaceVariant} style={styles.moveBtn}
                      onPress={() => setMenuFor(ex.id)} accessibilityLabel={`Options for ${ex.name}`} />
                  }>
                  <Menu.Item leadingIcon="chevron-up" title="Move up" disabled={idx === 0}
                    onPress={() => { setMenuFor(null); moveExercise(idx, -1); }} />
                  <Menu.Item leadingIcon="chevron-down" title="Move down" disabled={idx === displayed.length - 1}
                    onPress={() => { setMenuFor(null); moveExercise(idx, 1); }} />
                  {idx < displayed.length - 1 && (
                    <Menu.Item leadingIcon={links[ex.id] ? 'link-variant-off' : 'link-variant'}
                      title={links[ex.id] ? 'Unlink superset' : `Superset with ${displayed[idx + 1].name}`}
                      onPress={() => { setMenuFor(null); toggleLink(ex.id); }} />
                  )}
                  {ex.logType === 'weight_reps' && (
                    <Menu.Item leadingIcon="calculator-variant" title="Plate calculator"
                      onPress={() => { setMenuFor(null); setPlateFor(sets[sets.length - 1]?.weight || sug?.weight || prev[0]?.weight || 60); }} />
                  )}
                  <Menu.Item leadingIcon="close" title="Remove exercise" titleStyle={{ color: colors.error }}
                    onPress={() => askRemoveExercise(ex)} />
                </Menu>
              </View>

              {!!ex.mechanic && (
                <View style={styles.classRow}>
                  <View style={[styles.classChip, { backgroundColor: colors.surfaceVariant }]}>
                    <Text variant="labelSmall" style={{ color: colors.onSurface }}>
                      {mechanicLabel(ex.mechanic)}
                    </Text>
                  </View>
                  <Text variant="labelSmall" style={{ color: colors.onSurface }}>
                    Rest {formatRest(restFor(ex))} suggested
                  </Text>
                </View>
              )}

              <View style={styles.tableHeader}>
                <Text variant="labelSmall" style={[styles.tableSet, { color: colors.onSurfaceVariant }]}>SET</Text>
                <Text variant="labelSmall" style={[styles.tablePrev, { color: colors.onSurfaceVariant }]}>PREV</Text>
                <Text variant="labelSmall" style={[styles.tableKg, { color: colors.onSurfaceVariant }]}>{weightUnit.toUpperCase()}</Text>
                <Text variant="labelSmall" style={[styles.tableReps, { color: colors.onSurfaceVariant }]}>REPS</Text>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>✓</Text>
              </View>

              {sets.map((s, i) => (
                <Pressable key={s.id} style={styles.setRow} onPress={() => openEditSet(s, ex)}
                  accessibilityRole="button" accessibilityLabel={`Set ${i + 1}, logged. Edit`}>
                  <Text variant="bodyMedium" style={[styles.tableSet, { color: colors.onSurface }]}>{i + 1}</Text>
                  <Text variant="bodySmall" style={[styles.tablePrev, { color: colors.onSurface }]} numberOfLines={1}>{prev[i] ? formatSetCompact(prev[i], (ex.logType || 'weight_reps') as LogType) : '—'}</Text>
                  <Text variant="bodyMedium" style={[styles.tableKg, { color: colors.onSurface }]}>{s.weight || '—'}</Text>
                  <Text variant="bodyMedium" style={[styles.tableReps, { color: colors.onSurface }]}>{s.reps || '—'}</Text>
                  <View style={[styles.setCheck, { backgroundColor: typeColor(s.setType) }]}>
                    <MaterialCommunityIcons name="check" size={15} color="#FFFFFF" />
                  </View>
                </Pressable>
              ))}

              {/* Planned sets — the routine's remaining sets, pre-filled. */}
              {Array.from({ length: Math.max(0, (tgt?.sets ?? 0) - sets.length) }, (_, k) => {
                const i = sets.length + k;
                const plan = plannedFor(ex, i);
                return (
                  <Pressable key={`plan-${i}`} style={styles.setRow} onPress={() => openKeypad(ex, i)}
                    accessibilityRole="button" accessibilityLabel={`Set ${i + 1}, planned. Adjust before logging`}>
                    <Text variant="bodyMedium" style={[styles.tableSet, { color: colors.onSurface }]}>{i + 1}</Text>
                    <Text variant="bodySmall" style={[styles.tablePrev, { color: colors.onSurface }]} numberOfLines={1}>{prev[i] ? formatSetCompact(prev[i], (ex.logType || 'weight_reps') as LogType) : '—'}</Text>
                    <Text variant="bodyMedium" style={[styles.tableKg, { color: colors.onSurfaceVariant }]}>{plan.weight ?? '—'}</Text>
                    <Text variant="bodyMedium" style={[styles.tableReps, { color: colors.onSurfaceVariant }]}>{plan.reps ?? '—'}</Text>
                    <Pressable onPress={() => quickLog(ex, i)} hitSlop={10} accessibilityRole="checkbox"
                      accessibilityState={{ checked: false }} accessibilityLabel={`Log set ${i + 1}`}
                      style={[styles.setCheck, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline, borderWidth: 1 }]} />
                  </Pressable>
                );
              })}

              {ex.logType === 'weight_reps' && !!sug && (
                <View style={styles.suggestRow}>
                  <Pressable onPress={() => openKeypad(ex)} style={[styles.suggestChip, { backgroundColor: accent }]}
                    accessibilityRole="button" accessibilityLabel={`Suggested ${sug.weight} ${weightUnit} for ${sug.reps} reps. Log a set`}>
                    <Text variant="labelMedium" style={{ color: '#FFFFFF' }}>
                      Suggested {sug.weight}×{sug.reps}
                    </Text>
                  </Pressable>
                  {teByExercise[ex.id] != null && (
                    <Pressable onPress={() => applyToRoutine(ex)} disabled={appliedTe[ex.id]}
                      style={[styles.applyChip, { borderColor: accent, opacity: appliedTe[ex.id] ? 0.5 : 1 }]}>
                      <Text variant="labelMedium" style={{ color: colors.onSurface }}>
                        {appliedTe[ex.id] ? 'Saved' : 'Apply to routine'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              <Pressable onPress={() => openKeypad(ex)} style={styles.addSetBtn} accessibilityRole="button" hitSlop={6}>
                <MaterialCommunityIcons name="plus" size={16} color={colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Add set</Text>
              </Pressable>
            </MotionCard>
          );
        })}

        {displayed.length === 0 && templates.length > 0 && (
          <View style={styles.quickStart}>
            <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '300', marginBottom: spacing.xs }}>
              Start from a routine
            </Text>
            {templates.slice(0, 6).map(t => (
              <Pressable key={t.id} onPress={() => applyTemplate(t.id)}
                style={[styles.routineRow, { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons name="clipboard-list" size={20} color={accent} />
                <View style={styles.routineInfo}>
                  <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '300' }}>{t.name}</Text>
                  {!!t.description && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{t.description}</Text>}
                </View>
                <MaterialCommunityIcons name="play-circle" size={22} color={accent} />
              </Pressable>
            ))}
          </View>
        )}

        <Button mode="outlined" icon="plus" style={[styles.addExBtn, { borderColor: colors.onSurface }]} textColor={colors.onSurface}
          contentStyle={styles.outlineAction} onPress={() => setPickerVisible(true)}>
          {displayed.length === 0 ? 'Or add exercises one by one' : 'Add Exercise'}
        </Button>
        <Button mode="outlined" icon="sync" style={[styles.addCircuitBtn, { backgroundColor: withAlpha(accent, 0.12) }]}
          textColor={colors.accentText} contentStyle={styles.outlineAction} onPress={() => setCircuitVisible(true)}>
          Add a circuit
        </Button>
        <Button mode="text" textColor={colors.error} style={styles.discardBtn} onPress={() => setDiscardVisible(true)}>
          Discard workout
        </Button>
      </ScrollView>

      <View style={[styles.finishBar, { backgroundColor: colors.background, borderTopColor: colors.outline }]}> 
        <Button mode="contained" icon="check" onPress={() => setFinishVisible(true)} style={styles.finishBtn} contentStyle={styles.primaryContent} buttonColor={accent} disabled={totalSets === 0}>
          Finish Workout
        </Button>
      </View>

      {keypadFor && (
        <SetKeypad
          visible
          exerciseName={keypadFor.name}
          logType={keypadFor.logType}
          initial={keypadFor.initial}
          weightUnit={weightUnit}
          confirmLabel={keypadFor.editSetId ? 'Save changes' : 'Log set'}
          onConfirm={handleConfirm}
          onDelete={keypadFor.editSetId ? handleDeleteSet : undefined}
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
                <Text variant="labelMedium" style={{ color: colors.accentText }}>My gym's equipment only</Text>
              </Pressable>
            )}
            <ScrollView style={styles.pickerList}>
              {exercises.slice(0, 40).map(ex => (
                <TouchableRipple key={ex.id} onPress={() => addExerciseToSession(ex)} style={styles.pickerItem}>
                  <View>
                    <Text variant="bodyLarge" style={{ color: colors.onSurface }}>{ex.name}</Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1}>
                      {ex.primaryMuscles.length ? formatMuscles(ex.primaryMuscles, ex.secondaryMuscles) : ex.muscleGroup} · {ex.equipment}{ex.mechanic ? ` · ${mechanicLabel(ex.mechanic)}` : ''}
                    </Text>
                  </View>
                </TouchableRipple>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions><Button onPress={() => setPickerVisible(false)}>Done</Button></Dialog.Actions>
        </Dialog>

        <Dialog visible={circuitVisible} onDismiss={() => setCircuitVisible(false)} style={styles.pickerDialog}>
          <Dialog.Title>Add a circuit</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: spacing.sm }}>
              Drops a body-part circuit into your session and links the moves — rotate through with no rest.
            </Text>
            <ScrollView style={styles.pickerList}>
              {CIRCUITS.map(c => (
                <TouchableRipple key={c.name} onPress={() => handleAddCircuit(c)} style={styles.pickerItem}>
                  <View>
                    <Text variant="bodyLarge" style={{ color: colors.onSurface }}>{c.name}</Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1}>
                      {c.muscleGroup} · {c.exercises.join(' → ')}
                    </Text>
                  </View>
                </TouchableRipple>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions><Button onPress={() => setCircuitVisible(false)}>Done</Button></Dialog.Actions>
        </Dialog>

        <Dialog visible={discardVisible} onDismiss={() => setDiscardVisible(false)}>
          <Dialog.Title>Discard workout?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              This deletes the current workout and all its logged sets. To keep it, just go back — it stays in progress and you can resume it later.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.onSurface} onPress={() => setDiscardVisible(false)}>Cancel</Button>
            <Button textColor={colors.error} onPress={handleDiscard}>Discard</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={finishVisible} onDismiss={() => setFinishVisible(false)}>
          <Dialog.Title>Finish workout?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
              {totalSets} set{totalSets === 1 ? '' : 's'} across {loggedIds.size} exercise{loggedIds.size === 1 ? '' : 's'}{elapsed ? ` · ${elapsed}` : ''}
            </Text>
            {skipped.length > 0 && (
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: spacing.sm }}>
                No sets logged for {skipped.map(e => e.name).join(', ')} — {skipped.length === 1 ? 'it' : 'they'} won't be saved.
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.accentText} onPress={() => setFinishVisible(false)}>Keep training</Button>
            <Button mode="contained" buttonColor={accent} textColor="#FFFFFF" onPress={handleFinish}>Finish</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!removeTarget} onDismiss={() => setRemoveTarget(null)}>
          <Dialog.Title>Remove {removeTarget?.name}?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              {(() => {
                const n = activeSets.filter(s => s.exerciseId === removeTarget?.id).length;
                return `This also deletes the ${n === 1 ? 'set' : `${n} sets`} you've logged for it in this workout.`;
              })()}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.onSurface} onPress={() => setRemoveTarget(null)}>Cancel</Button>
            <Button textColor={colors.error} onPress={() => removeTarget && removeExercise(removeTarget)}>Remove</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Lifted above the Finish bar so a toast never blocks it. */}
      <Snackbar visible={!!prSnack} onDismiss={() => setPrSnack('')} duration={3500} wrapperStyle={styles.snackAboveBar}>{prSnack}</Snackbar>
      <Snackbar visible={!!undoSet} onDismiss={() => setUndoSet(null)} duration={7000} wrapperStyle={styles.snackAboveBar}
        action={{ label: 'Undo', onPress: handleUndoDelete }}>
        Set deleted
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  exCard: { marginBottom: spacing.sm, padding: 15 },
  headerFinish: { borderRadius: shape.md },
  exHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  exTitleWrap: { flex: 1 },
  exNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exName: { fontWeight: '300' },
  exControls: { flexDirection: 'row', alignItems: 'center' },
  moveBtn: { margin: 0 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  classChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: shape.pill },
  gymToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: shape.pill, marginBottom: spacing.sm },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, paddingBottom: 4 },
  tableSet: { width: 40 },
  tablePrev: { width: 110 },
  tableKg: { width: 72, textAlign: 'center' },
  tableReps: { width: 58, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  setCheck: { width: 22, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  suggestChip: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: shape.pill, marginTop: spacing.sm },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  applyChip: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 5, borderRadius: shape.pill, borderWidth: 1.5, marginTop: spacing.sm },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: spacing.sm },
  addExBtn: { marginTop: spacing.sm, borderRadius: shape.md },
  addCircuitBtn: { marginTop: spacing.sm, borderRadius: shape.md, borderColor: accent },
  outlineAction: { height: 44 },
  quickStart: { marginTop: spacing.sm },
  supersetBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discardBtn: { marginTop: spacing.sm, alignSelf: 'center' },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: shape.md, marginBottom: spacing.xs },
  routineInfo: { flex: 1 },
  finishBar: { padding: spacing.md, borderTopWidth: 1 },
  snackAboveBar: { bottom: 72 },
  finishBtn: { borderRadius: shape.md },
  primaryContent: { height: 48 },
  pickerDialog: { maxHeight: '80%' },
  pickerSearch: { marginBottom: spacing.sm },
  pickerList: { maxHeight: 320 },
  pickerItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
});
