import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, moduleColors, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { useWorkoutStore, type ExerciseRecord } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
import { assessStrength, STRENGTH_LEVELS, STRENGTH_STANDARDS } from '@/data/strengthStandards';

export default function RecordsScreen() {
  const { colors } = useAppTheme();
  const { getAllRecords } = useWorkoutStore();
  const { profile, updateProfile } = useUserStore();
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const unit = profile?.weightUnit ?? 'kg';
  const bodyweight = profile?.weight ?? 0;
  const sex = profile?.sex ?? 'male';

  useFocusEffect(useCallback(() => { getAllRecords().then(setRecords); }, []));

  const standardLifts = records.filter(r => STRENGTH_STANDARDS[r.exercise.name]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Records" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {records.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="trophy-outline" size={56} color={moduleColors.workout} />
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.sm }}>
              No records yet. Log some weighted sets and your personal bests appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* Strength standards */}
            <View style={styles.headRow}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>Strength standards</Text>
              <SegmentedButtons
                density="small"
                value={sex.toLowerCase().startsWith('f') ? 'female' : 'male'}
                onValueChange={v => updateProfile({ sex: v })}
                buttons={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
                style={styles.sexToggle}
              />
            </View>

            {bodyweight <= 0 && (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: spacing.sm }}>
                Set your bodyweight in Profile to see where your lifts rank.
              </Text>
            )}

            {standardLifts.length === 0 ? (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: spacing.md }}>
                Train a main lift (Bench, Squat, Deadlift, Overhead Press, Row) to unlock strength ratings.
              </Text>
            ) : standardLifts.map((r, i) => {
              const a = assessStrength(r.exercise.name, r.best1RM, bodyweight, sex);
              return (
                <MotionCard key={r.exercise.id} index={i} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700', flex: 1 }}>{r.exercise.name}</Text>
                    {a && (
                      <View style={[styles.levelPill, { backgroundColor: withAlpha(accent, 0.16) }]}>
                        <Text variant="labelMedium" style={{ color: accent, fontWeight: '800' }}>{a.level}</Text>
                      </View>
                    )}
                  </View>
                  {a ? (
                    <>
                      <View style={styles.levelBar}>
                        {STRENGTH_LEVELS.map((lvl, idx) => (
                          <View key={lvl} style={[
                            styles.levelSeg,
                            { backgroundColor: idx <= a.levelIndex ? accent : colors.surfaceVariant },
                            idx === 0 && styles.segFirst,
                            idx === STRENGTH_LEVELS.length - 1 && styles.segLast,
                          ]} />
                        ))}
                      </View>
                      <View style={styles.levelLabels}>
                        {STRENGTH_LEVELS.map(lvl => (
                          <Text key={lvl} variant="labelSmall" style={{ color: colors.onSurfaceVariant, fontSize: 8.5 }}>{lvl.slice(0, 4)}</Text>
                        ))}
                      </View>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
                        Est. 1RM {r.best1RM} {unit} · {a.ratio.toFixed(2)}× bodyweight
                        {a.nextRatio ? ` · ${Math.round(a.nextRatio * bodyweight)} ${unit} for ${STRENGTH_LEVELS[a.levelIndex + 1]}` : ' · top tier'}
                      </Text>
                    </>
                  ) : (
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Best est. 1RM {r.best1RM} {unit}</Text>
                  )}
                </MotionCard>
              );
            })}

            {/* All personal bests */}
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface, marginTop: spacing.md }]}>Personal bests</Text>
            {records.map(r => (
              <View key={r.exercise.id} style={[styles.prRow, { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons name="trophy" size={20} color={accent} />
                <View style={styles.prInfo}>
                  <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>{r.exercise.name}</Text>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                    Top {r.bestWeight} {unit} × {r.bestWeightReps} · 1RM {r.best1RM} · best {r.bestReps} reps
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: spacing.xl },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, gap: spacing.sm },
  sectionTitle: { fontWeight: '800', marginBottom: spacing.sm },
  sexToggle: { transform: [{ scale: 0.85 }] },
  card: { marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  levelPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: shape.pill },
  levelBar: { flexDirection: 'row', gap: 3, height: 10 },
  levelSeg: { flex: 1, borderRadius: 2 },
  segFirst: { borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  segLast: { borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  levelLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: shape.sm, marginBottom: spacing.xs },
  prInfo: { flex: 1 },
});
