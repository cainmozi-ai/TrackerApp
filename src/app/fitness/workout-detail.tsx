import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Button, IconButton, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, moduleColors } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
import { type LogType, formatSet } from '@/utils/workout';
import type { WorkoutLog, WorkoutSet } from '@/types';

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return 'in progress';
  const ms = new Date(finishedAt.replace(' ', 'T')).getTime() - new Date(startedAt.replace(' ', 'T')).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
}

export default function WorkoutDetailScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getWorkoutDetail, deleteWorkout } = useWorkoutStore();
  const { profile } = useUserStore();
  const [workout, setWorkout] = useState<WorkoutLog | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const weightUnit = profile?.weightUnit ?? 'kg';

  useEffect(() => {
    (async () => {
      const wid = Number(id);
      if (!wid) return;
      const detail = await getWorkoutDetail(wid);
      if (detail) {
        setWorkout(detail.workout);
        setSets(detail.sets);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!workout) return;
    await deleteWorkout(workout.id);
    setConfirmDelete(false);
    router.back();
  };

  const totalVolume = Math.round(sets.reduce((sum, s) => sum + s.weight * s.reps, 0));
  const exerciseIds = Array.from(new Set(sets.map(s => s.exerciseId)));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={workout?.name || 'Workout'}
        right={<IconButton icon="trash-can-outline" iconColor={colors.onSurfaceVariant} onPress={() => setConfirmDelete(true)} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: spacing.sm }}>
          {workout?.startedAt?.slice(0, 10)} · {workout ? formatDuration(workout.startedAt, workout.finishedAt) : ''}
        </Text>

        <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
          <View style={styles.stat}>
            <Text variant="titleMedium" style={{ color: colors.accentText, fontWeight: '300' }}>{exerciseIds.length}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Exercises</Text>
          </View>
          <View style={styles.stat}>
            <Text variant="titleMedium" style={{ color: colors.accentText, fontWeight: '300' }}>{sets.length}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Sets</Text>
          </View>
          <View style={styles.stat}>
            <Text variant="titleMedium" style={{ color: colors.accentText, fontWeight: '300' }}>{totalVolume}</Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Volume ({weightUnit})</Text>
          </View>
        </View>

        <Button mode="contained" icon="repeat" buttonColor={accent} style={styles.repeatBtn}
          onPress={() => router.push(`/fitness/active-workout?repeatOf=${workout?.id}`)}>
          Repeat This Workout
        </Button>

        {exerciseIds.map(exId => {
          const exSets = sets.filter(s => s.exerciseId === exId);
          const name = exSets[0]?.exercise?.name || 'Exercise';
          const logType = (exSets[0]?.exercise?.logType || 'weight_reps') as LogType;
          return (
            <View key={exId} style={[styles.exCard, { backgroundColor: colors.surface }]}>
              <View style={styles.exHead}>
                <MaterialCommunityIcons name="dumbbell" size={18} color={moduleColors.workout} />
                <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '300', flex: 1 }}>{name}</Text>
                <IconButton icon="information-outline" size={18}
                  onPress={() => router.push(`/fitness/exercise-detail?id=${exId}`)} style={styles.infoBtn} />
              </View>
              {exSets.map((s, i) => (
                <Text key={s.id} variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  Set {i + 1}: {formatSet(s, logType, weightUnit)}
                  {s.rpe != null ? ` · ${s.rpe} RIR` : ''}{s.setType !== 'normal' ? ` · ${s.setType}` : ''}
                </Text>
              ))}
            </View>
          );
        })}
      </ScrollView>

      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>Delete workout?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              This permanently removes the workout and its {sets.length} logged sets from your history and progress charts.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(false)}>Cancel</Button>
            <Button textColor={colors.error} onPress={handleDelete}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm, borderRadius: shape.md, marginBottom: spacing.sm },
  stat: { alignItems: 'center' },
  repeatBtn: { borderRadius: shape.md, marginBottom: spacing.md },
  exCard: { padding: spacing.md, borderRadius: shape.md, marginBottom: spacing.sm },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoBtn: { margin: 0 },
});
