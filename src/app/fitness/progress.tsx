import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Dimensions } from 'react-native';
import { Text, IconButton, Surface, Button, Portal, Dialog, Searchbar, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing, accent, withAlpha } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useWorkoutStore, type ProgressionEntry, type WorkoutSummary } from '@/stores/workoutStore';
import { VOLUME_LANDMARKS, volumeStatus, type VolumeStatus } from '@/data/volumeLandmarks';
import type { Exercise } from '@/types';

const screenWidth = Dimensions.get('window').width;

const VOL_STATUS_COLOR: Record<VolumeStatus, string> = {
  under: '#FF6B6B', low: '#FFA726', optimal: '#66BB6A', high: '#66BB6A', over: '#A83232',
};

/** Set-type legend + segment colours for the per-muscle breakdown. */
const SET_TYPE_META: { key: string; label: string; color: string }[] = [
  { key: 'warmup', label: 'Warm-up', color: '#A83232' },
  { key: 'normal', label: 'Normal', color: '#9A9AA0' },
  { key: 'failure', label: 'Failure', color: '#FF6B6B' },
  { key: 'drop', label: 'Drop', color: '#A83232' },
  { key: 'assisted', label: 'Assisted', color: '#66BB6A' },
  { key: 'partial', label: 'Partials', color: '#FFA726' },
  { key: 'static', label: 'Static', color: '#A83232' },
];

export default function ProgressScreen() {
  const { recentWorkouts, loadRecentWorkouts, exercises, loadExercises, getExerciseHistory, getMuscleVolume, getMuscleSetBreakdown, getProgressionReport, getWorkoutSummaries } = useWorkoutStore();
  const [summaries, setSummaries] = useState<WorkoutSummary[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<{ date: string; maxWeight: number; volume: number }[]>([]);
  const [muscleVol, setMuscleVol] = useState<{ muscleGroup: string; sets: number }[]>([]);
  const [breakdown, setBreakdown] = useState<{ muscleGroup: string; total: number; byType: Record<string, number> }[]>([]);
  const [progression, setProgression] = useState<ProgressionEntry[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadRecentWorkouts();
    loadExercises('All');
    getMuscleVolume(7).then(setMuscleVol);
    getMuscleSetBreakdown(30).then(setBreakdown);
    getProgressionReport().then(setProgression);
    getWorkoutSummaries().then(setSummaries);
  }, []);

  useEffect(() => {
    loadExercises('All', search);
  }, [search]);

  const pickExercise = async (ex: Exercise) => {
    setSelected(ex);
    setPickerVisible(false);
    const h = await getExerciseHistory(ex.id);
    setHistory(h);
  };

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
    labelColor: () => theme.colors.onSurfaceVariant,
    propsForDots: { r: '4', strokeWidth: '2', stroke: moduleColors.workout },
  };

  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Progress" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.summaryCard} elevation={1}>
          <MaterialCommunityIcons name="calendar-check" size={28} color={moduleColors.workout} />
          <Text variant="headlineMedium" style={styles.summaryValue}>{recentWorkouts.length}</Text>
          <Text variant="bodyMedium" style={styles.summaryLabel}>workouts completed</Text>
        </Surface>

        {muscleVol.length > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleSmall" style={styles.chartTitle}>Weekly volume · sets vs landmarks</Text>
            <Text variant="labelSmall" style={[styles.volSub, { color: colors.onSurfaceVariant }]}>
              The bar spans your minimum-effective to maximum-recoverable weekly sets.
            </Text>
            {(() => {
              const bySet: Record<string, number> = {};
              for (const m of muscleVol) bySet[m.muscleGroup] = m.sets;
              return Object.entries(VOLUME_LANDMARKS).map(([group, lm]) => {
                const sets = bySet[group] || 0;
                const { status, label } = volumeStatus(sets, lm);
                const color = VOL_STATUS_COLOR[status];
                // MEV sits at mev/mrv of the track; the fill caps at the MRV width.
                const mevPct = Math.min(100, (lm.mev / lm.mrv) * 100);
                const fillPct = Math.min(100, (sets / lm.mrv) * 100);
                return (
                  <View key={group} style={styles.lmRow}>
                    <View style={styles.lmHead}>
                      <Text variant="labelMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>{group}</Text>
                      <Text variant="labelSmall" style={{ color }}>{sets} sets · {label}</Text>
                    </View>
                    <View style={[styles.lmTrack, { backgroundColor: withAlpha(colors.onSurfaceVariant, 0.12) }]}>
                      <View style={[styles.lmFill, { width: `${fillPct}%`, backgroundColor: color }]} />
                      <View style={[styles.lmMev, { left: `${mevPct}%`, backgroundColor: colors.onSurface }]} />
                    </View>
                  </View>
                );
              });
            })()}
          </Surface>
        )}

        {breakdown.length > 0 && (() => {
          const present = SET_TYPE_META.filter(t => breakdown.some(m => m.byType[t.key]));
          return (
            <Surface style={styles.chartCard} elevation={1}>
              <Text variant="titleSmall" style={styles.chartTitle}>Sets by type · 30 days</Text>
              <View style={styles.legendRow}>
                {present.map(t => (
                  <View key={t.key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: t.color }]} />
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{t.label}</Text>
                  </View>
                ))}
              </View>
              {breakdown.map(m => (
                <View key={m.muscleGroup} style={styles.volRow}>
                  <Text variant="labelMedium" style={[styles.volLabel, { color: colors.onSurfaceVariant }]}>{m.muscleGroup}</Text>
                  <View style={styles.bdBar}>
                    {present.map(t => (m.byType[t.key]
                      ? <View key={t.key} style={{ flex: m.byType[t.key], backgroundColor: t.color }} />
                      : null))}
                  </View>
                  <Text variant="labelMedium" style={[styles.volCount, { color: colors.onSurface }]}>{m.total}</Text>
                </View>
              ))}
            </Surface>
          );
        })()}

        {progression.length > 0 && (
          <>
            <Text variant="titleSmall" style={styles.sectionTitle}>Progressive Overload</Text>
            {progression.map(p => (
              <TouchableRipple key={p.exercise.id} borderless style={styles.progressionTouch}
                onPress={() => router.push(`/fitness/exercise-detail?id=${p.exercise.id}`)}>
                <Surface style={styles.progressionRow} elevation={0}>
                  <MaterialCommunityIcons
                    name={p.status === 'increase' ? 'arrow-up-bold-circle' : 'repeat'}
                    size={22}
                    color={p.status === 'increase' ? accent : '#A83232'}
                  />
                  <View style={styles.workoutInfo}>
                    <Text variant="bodyMedium">{p.exercise.name}</Text>
                    <Text variant="labelSmall" style={styles.workoutDate}>
                      {p.status === 'increase'
                        ? `Ready to move up: ${p.lastWeight} kg → ${p.suggestedWeight} kg`
                        : `Stay at ${p.lastWeight} kg · aim for ${p.suggestedReps} reps (last: ${p.lastBestReps})`}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                </Surface>
              </TouchableRipple>
            ))}
          </>
        )}

        <Text variant="titleSmall" style={styles.sectionTitle}>Exercise Progress</Text>
        <Button mode="contained-tonal" icon="chart-line" onPress={() => setPickerVisible(true)} style={styles.selectBtn}>
          {selected ? selected.name : 'Select an exercise'}
        </Button>

        {selected && history.length === 0 && (
          <Text variant="bodyMedium" style={styles.emptyText}>
            No history yet for {selected.name}. Log some workouts with this exercise!
          </Text>
        )}

        {selected && history.length > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleSmall" style={styles.chartTitle}>Max Weight (kg)</Text>
            <LineChart
              data={{
                labels: history.map(h => h.date.slice(5)).slice(-6),
                datasets: [{ data: history.map(h => h.maxWeight).slice(-6) }],
              }}
              width={screenWidth - spacing.md * 4}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </Surface>
        )}

        <Text variant="titleSmall" style={styles.sectionTitle}>Recent Workouts</Text>
        {summaries.length === 0 ? (
          <Text variant="bodyMedium" style={styles.emptyText}>No completed workouts yet</Text>
        ) : (
          summaries.map(s => (
            <TouchableRipple key={s.workout.id} borderless style={styles.progressionTouch}
              onPress={() => router.push(`/fitness/workout-detail?id=${s.workout.id}`)}>
              <Surface style={styles.workoutCard} elevation={0}>
                <View style={styles.workoutCardHead}>
                  <View style={[styles.workoutIcon, { backgroundColor: withAlpha(moduleColors.workout, 0.15) }]}>
                    <MaterialCommunityIcons name="dumbbell" size={20} color={moduleColors.workout} />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text variant="titleSmall" style={{ fontWeight: '700' }}>{s.workout.name}</Text>
                    <Text variant="labelSmall" style={styles.workoutDate}>
                      {s.workout.startedAt?.slice(0, 10)} · {s.durationMin >= 60 ? `${Math.floor(s.durationMin / 60)}h ${s.durationMin % 60}m` : `${s.durationMin} min`}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                </View>
                <View style={styles.workoutStats}>
                  <View style={styles.workoutStat}>
                    <Text variant="labelSmall" style={styles.workoutStatLabel}>EXERCISES</Text>
                    <Text variant="titleSmall" style={{ fontWeight: '800', color: accent }}>{s.exerciseCount}</Text>
                  </View>
                  <View style={styles.workoutStat}>
                    <Text variant="labelSmall" style={styles.workoutStatLabel}>SETS</Text>
                    <Text variant="titleSmall" style={{ fontWeight: '800', color: accent }}>{s.setCount}</Text>
                  </View>
                  <View style={styles.workoutStat}>
                    <Text variant="labelSmall" style={styles.workoutStatLabel}>VOLUME</Text>
                    <Text variant="titleSmall" style={{ fontWeight: '800', color: accent }}>{s.volume}</Text>
                  </View>
                </View>
                {s.muscles.length > 0 && (
                  <Text variant="labelSmall" style={[styles.workoutDate, { marginTop: 4 }]} numberOfLines={1}>
                    {s.muscles.join(' · ')}
                  </Text>
                )}
              </Surface>
            </TouchableRipple>
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)} style={styles.pickerDialog}>
          <Dialog.Title>Select Exercise</Dialog.Title>
          <Dialog.Content>
            <Searchbar placeholder="Search..." value={search} onChangeText={setSearch} style={styles.pickerSearch} />
            <ScrollView style={styles.pickerList}>
              {exercises.slice(0, 40).map(ex => (
                <TouchableRipple key={ex.id} onPress={() => pickExercise(ex)} style={styles.pickerItem}>
                  <Text variant="bodyLarge">{ex.name}</Text>
                </TouchableRipple>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickerVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  summaryCard: { alignItems: 'center', padding: spacing.lg, borderRadius: 16, backgroundColor: theme.colors.surface, gap: 4, marginBottom: spacing.md },
  summaryValue: { fontWeight: '700', color: moduleColors.workout },
  summaryLabel: { color: theme.colors.onSurfaceVariant },
  sectionTitle: { fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm },
  selectBtn: { marginBottom: spacing.md },
  emptyText: { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginVertical: spacing.md },
  chartCard: { padding: spacing.md, borderRadius: 16, backgroundColor: theme.colors.surface, marginBottom: spacing.md, alignItems: 'center' },
  chartTitle: { fontWeight: '600', alignSelf: 'flex-start', marginBottom: spacing.sm },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs, alignSelf: 'stretch' },
  volLabel: { width: 76 },
  volTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  volFill: { height: '100%', borderRadius: 5 },
  volCount: { width: 24, textAlign: 'right' },
  volSub: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  lmRow: { alignSelf: 'stretch', marginBottom: spacing.sm },
  lmHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  lmTrack: { height: 10, borderRadius: 5, position: 'relative', overflow: 'hidden' },
  lmFill: { height: '100%', borderRadius: 5 },
  lmMev: { position: 'absolute', top: -2, width: 2, height: 14, opacity: 0.6 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignSelf: 'stretch', marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  bdBar: { flex: 1, flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(128,128,128,0.12)' },
  chart: { borderRadius: 12 },
  workoutRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: theme.colors.surface, borderRadius: 10, marginBottom: spacing.xs, gap: spacing.sm },
  progressionTouch: { borderRadius: 10, marginBottom: spacing.xs },
  workoutCard: { padding: spacing.md, backgroundColor: theme.colors.surface, borderRadius: 12 },
  workoutCardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  workoutIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  workoutStats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  workoutStat: {},
  workoutStatLabel: { color: theme.colors.onSurfaceVariant, letterSpacing: 0.8, fontSize: 10 },
  progressionRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: theme.colors.surface, borderRadius: 10, gap: spacing.sm },
  workoutInfo: { flex: 1 },
  workoutDate: { color: theme.colors.onSurfaceVariant },
  pickerDialog: { maxHeight: '80%' },
  pickerSearch: { marginBottom: spacing.sm, backgroundColor: theme.colors.surfaceVariant },
  pickerList: { maxHeight: 320 },
  pickerItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
});
