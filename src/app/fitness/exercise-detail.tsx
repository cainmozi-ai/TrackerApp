import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Linking } from 'react-native';
import { Text, Button, Chip, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, moduleColors, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { useWorkoutStore, estimate1RM } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
import { type LogType, formatSet } from '@/utils/workout';
import { effectiveIncrement } from '@/utils/progression';
import type { Exercise, WorkoutSet } from '@/types';

export default function ExerciseDetailScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getExercise, getLastSets, getProgressionSuggestion, getExerciseHistory, setExerciseIncrement } = useWorkoutStore();
  const { profile } = useUserStore();
  const unit = profile?.weightUnit ?? 'kg';
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [lastSets, setLastSets] = useState<WorkoutSet[]>([]);
  const [suggestion, setSuggestion] = useState<{ weight: number; reps: number } | null>(null);
  const [history, setHistory] = useState<{ date: string; maxWeight: number; volume: number }[]>([]);

  useEffect(() => {
    (async () => {
      const exId = Number(id);
      if (!exId) return;
      const ex = await getExercise(exId);
      setExercise(ex);
      if (ex) {
        setLastSets(await getLastSets(exId));
        setSuggestion(await getProgressionSuggestion(exId, 12));
        setHistory(await getExerciseHistory(exId));
      }
    })();
  }, [id]);

  const openFormVideo = () => {
    if (!exercise) return;
    const query = encodeURIComponent(`${exercise.name} proper form technique`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
  };

  if (!exercise) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader title="Exercise" />
      </SafeAreaView>
    );
  }

  const logType = (exercise.logType || 'weight_reps') as LogType;
  const isWeight = logType === 'weight_reps';
  const currentInc = effectiveIncrement(exercise.weightIncrement, exercise.equipment);
  const changeIncrement = async (delta: number) => {
    const next = Math.max(0.5, Math.round((currentInc + delta) * 100) / 100);
    await setExerciseIncrement(exercise.id, next);
    setExercise({ ...exercise, weightIncrement: next });
    setSuggestion(await getProgressionSuggestion(exercise.id, 12));
  };
  const working = lastSets.filter(s => s.setType !== 'warmup');
  const best1RM = working.reduce((best, s) => Math.max(best, estimate1RM(s.weight, s.reps)), 0);
  const lastWeight = working.length ? Math.max(...working.map(s => s.weight)) : 0;
  const readyToProgress = isWeight && !!suggestion && suggestion.weight > lastWeight && lastWeight > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title={exercise.name} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.tagRow}>
          <Chip icon="arm-flex" compact>{exercise.muscleGroup}</Chip>
          <Chip icon="dumbbell" compact>{exercise.equipment}</Chip>
          <Chip icon="cog" compact>{exercise.mechanic === 'isolation' ? 'Isolation' : 'Compound'}</Chip>
          {exercise.isCustom && <Chip icon="account" compact>Custom</Chip>}
        </View>

        {(exercise.primaryMuscles.length > 0 || exercise.secondaryMuscles.length > 0) && (
          <View style={styles.musclesRow}>
            {exercise.primaryMuscles.length > 0 && (
              <Text variant="bodySmall" style={{ color: colors.onSurface }}>
                <Text style={{ fontWeight: '700' }}>Primary: </Text>{exercise.primaryMuscles.join(', ')}
              </Text>
            )}
            {exercise.secondaryMuscles.length > 0 && (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                <Text style={{ fontWeight: '700' }}>Secondary: </Text>{exercise.secondaryMuscles.join(', ')}
              </Text>
            )}
          </View>
        )}

        {!!exercise.description && (
          <Text variant="bodyMedium" style={[styles.description, { color: colors.onSurfaceVariant }]}>
            {exercise.description}
          </Text>
        )}

        <Button mode="contained" icon="youtube" onPress={openFormVideo}
          buttonColor="#FF0000" textColor="#fff" style={styles.videoBtn}>
          Watch Form Video
        </Button>

        {exercise.tips.length > 0 && (
          <MotionCard style={styles.card}>
            <View style={styles.cardHead}>
              <MaterialCommunityIcons name="school" size={20} color={moduleColors.workout} />
              <Text variant="titleSmall" style={[styles.cardTitle, { color: colors.onSurface }]}>Form Tips</Text>
            </View>
            {exercise.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color={accent} style={styles.tipIcon} />
                <Text variant="bodyMedium" style={[styles.tipText, { color: colors.onSurface }]}>{tip}</Text>
              </View>
            ))}
          </MotionCard>
        )}

        <MotionCard index={1} style={styles.card}>
          <View style={styles.cardHead}>
            <MaterialCommunityIcons name={isWeight ? 'trending-up' : 'history'} size={20} color={accent} />
            <Text variant="titleSmall" style={[styles.cardTitle, { color: colors.onSurface }]}>
              {isWeight ? 'Progressive Overload' : 'Recent Sets'}
            </Text>
          </View>

          {working.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              No sets logged yet. Once you train this exercise, it shows up here.
            </Text>
          ) : (
            <>
              {isWeight && (
                <>
                  <View style={[styles.verdict, { backgroundColor: withAlpha(readyToProgress ? accent : '#A83232', 0.14) }]}>
                    <MaterialCommunityIcons
                      name={readyToProgress ? 'arrow-up-bold-circle' : 'repeat'}
                      size={22}
                      color={readyToProgress ? accent : '#A83232'}
                    />
                    <View style={styles.verdictText}>
                      <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
                        {readyToProgress
                          ? `Move up — try ${suggestion!.weight} ${unit} × ${suggestion!.reps}`
                          : suggestion
                            ? `Stay at ${suggestion.weight} ${unit} — aim for ${suggestion.reps} reps`
                            : 'Keep logging to unlock suggestions'}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        {readyToProgress
                          ? 'You hit the top of your rep range last session. Time to add weight.'
                          : 'Add a rep each session; when you hit the top of the range, the weight goes up.'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.stat}>
                      <Text variant="titleMedium" style={{ color: accent, fontWeight: '800' }}>{lastWeight} {unit}</Text>
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Last top weight</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text variant="titleMedium" style={{ color: accent, fontWeight: '800' }}>{best1RM} {unit}</Text>
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Est. 1RM</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text variant="titleMedium" style={{ color: accent, fontWeight: '800' }}>{history.length}</Text>
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Sessions</Text>
                    </View>
                  </View>

                  <View style={[styles.incRow, { backgroundColor: withAlpha(accent, 0.08) }]}>
                    <MaterialCommunityIcons name="weight" size={18} color={accent} />
                    <View style={styles.verdictText}>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>Weight jump</Text>
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                        Added when you hit the top of the rep range
                        {exercise.weightIncrement == null ? ' · default for this equipment' : ''}
                      </Text>
                    </View>
                    <IconButton icon="minus" size={16} mode="contained-tonal" onPress={() => changeIncrement(-0.5)} />
                    <Text variant="titleMedium" style={{ color: accent, fontWeight: '800', minWidth: 52, textAlign: 'center' }}>
                      +{currentInc} {unit}
                    </Text>
                    <IconButton icon="plus" size={16} mode="contained-tonal" onPress={() => changeIncrement(0.5)} />
                  </View>
                </>
              )}

              <Text variant="labelMedium" style={[styles.lastLabel, { color: colors.onSurfaceVariant }]}>Last session</Text>
              {lastSets.map((s, i) => (
                <Text key={s.id} variant="bodySmall" style={{ color: colors.onSurface }}>
                  Set {i + 1}: {formatSet(s, logType, unit)}{s.rpe != null ? ` · ${s.rpe} RIR` : ''}{s.setType !== 'normal' ? ` · ${s.setType}` : ''}
                </Text>
              ))}
            </>
          )}
        </MotionCard>

        {isWeight && history.length > 1 && (
          <MotionCard index={2} style={styles.card}>
            <View style={styles.cardHead}>
              <MaterialCommunityIcons name="chart-line" size={20} color={moduleColors.workout} />
              <Text variant="titleSmall" style={[styles.cardTitle, { color: colors.onSurface }]}>Top Weight History</Text>
            </View>
            {history.slice(-8).reverse().map(h => (
              <View key={h.date} style={styles.histRow}>
                <Text variant="bodySmall" style={[styles.histDate, { color: colors.onSurfaceVariant }]}>{h.date}</Text>
                <View style={[styles.histTrack, { backgroundColor: withAlpha(moduleColors.workout, 0.15) }]}>
                  <View style={[styles.histFill, {
                    backgroundColor: moduleColors.workout,
                    width: `${Math.max(8, (h.maxWeight / Math.max(...history.map(x => x.maxWeight), 1)) * 100)}%`,
                  }]} />
                </View>
                <Text variant="bodySmall" style={[styles.histWeight, { color: colors.onSurface }]}>{h.maxWeight} {unit}</Text>
              </View>
            ))}
          </MotionCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  tagRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, flexWrap: 'wrap' },
  musclesRow: { gap: 2, marginBottom: spacing.md },
  description: { marginBottom: spacing.md, lineHeight: 20 },
  videoBtn: { marginBottom: spacing.md, borderRadius: shape.pill },
  card: { marginBottom: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { fontWeight: '700' },
  tipRow: { flexDirection: 'row', marginBottom: spacing.xs },
  tipIcon: { marginTop: 2, marginRight: spacing.sm },
  tipText: { flex: 1, lineHeight: 20 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: shape.md, marginBottom: spacing.sm },
  verdictText: { flex: 1 },
  incRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: shape.md, marginBottom: spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.sm },
  stat: { alignItems: 'center' },
  lastLabel: { marginBottom: 2 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  histDate: { width: 78 },
  histTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  histFill: { height: '100%', borderRadius: 4 },
  histWeight: { width: 56, textAlign: 'right', fontWeight: '600' },
});
