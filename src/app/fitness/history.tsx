import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useWorkoutStore, type WorkoutSummary } from '@/stores/workoutStore';

const PR_CHIP = '#C9A227';

/** Sessions finished in the current calendar month. */
function inThisMonth(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso.replace(' ', 'T'));
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function shortDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HistoryScreen() {
  const { colors } = useAppTheme();
  const { getWorkoutSummaries } = useWorkoutStore();
  const [summaries, setSummaries] = useState<WorkoutSummary[]>([]);

  useFocusEffect(useCallback(() => { getWorkoutSummaries(50).then(setSummaries); }, []));

  const monthCount = summaries.filter(s => inThisMonth(s.workout.finishedAt)).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="History" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text variant="bodyMedium" style={[styles.kicker, { color: colors.onSurfaceVariant }]}>
          This month · {monthCount} {monthCount === 1 ? 'workout' : 'workouts'}
        </Text>

        {summaries.length === 0 ? (
          <EmptyState icon="history" color={accent} title="No workouts yet"
            body="Finish a session and it will show up here." />
        ) : summaries.map((s, i) => (
          <MotionCard key={s.workout.id} index={i} style={styles.card}
            onPress={() => router.push(`/fitness/workout-detail?id=${s.workout.id}`)}>
            <View style={styles.head}>
              <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700', flex: 1 }}>
                {s.workout.name || 'Workout'}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {shortDate(s.workout.finishedAt)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Stat value={`${s.durationMin} min`} label="Duration" colors={colors} />
              <Stat value={`${Math.round(s.volume)} kg`} label="Volume" colors={colors} />
              <Stat value={`${s.setCount} sets`} label="Sets" colors={colors} />
            </View>

            <View style={styles.footRow}>
              {s.muscles.length > 0 && (
                <View style={[styles.musclesChip, { backgroundColor: withAlpha(PR_CHIP, 0.16) }]}>
                  <Text variant="labelSmall" style={{ color: PR_CHIP, fontWeight: '700' }}>
                    {s.muscles.slice(0, 3).join(' · ')}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <Button mode="outlined" compact textColor={accent} style={styles.repeatBtn}
                onPress={() => router.push(`/fitness/active-workout?repeatOf=${s.workout.id}`)}>
                Repeat
              </Button>
            </View>
          </MotionCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

type C = ReturnType<typeof useAppTheme>['colors'];

function Stat({ value, label, colors }: { value: string; label: string; colors: C }) {
  return (
    <View style={styles.stat}>
      <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>{value}</Text>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  kicker: { marginBottom: spacing.sm },
  card: { marginBottom: spacing.md, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center' },
  statRow: { flexDirection: 'row' },
  stat: { flex: 1, gap: 2 },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  musclesChip: { borderRadius: shape.pill, paddingHorizontal: 10, paddingVertical: 3 },
  repeatBtn: { borderRadius: shape.pill, borderColor: accent },
});
