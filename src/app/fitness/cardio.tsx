import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useWorkoutStore } from '@/stores/workoutStore';
import { formatDuration } from '@/utils/workout';
import type { Exercise } from '@/types';

type MdiName = keyof typeof MaterialCommunityIcons.glyphMap;

const CARDIO_ICON: [string, string][] = [
  ['Treadmill', 'run'], ['Running', 'run'], ['Sprint', 'run'],
  ['Bike', 'bike'], ['Cycling', 'bike'],
  ['Row', 'rowing'], ['Elliptical', 'walk'], ['Stair', 'stairs'],
  ['Ski', 'heart-pulse'], ['Jump Rope', 'jump-rope'], ['Swim', 'swim'], ['Walk', 'walk'],
];
function iconFor(name: string): MdiName {
  for (const [k, icon] of CARDIO_ICON) if (name.includes(k)) return icon as MdiName;
  return 'heart-pulse';
}

export default function CardioScreen() {
  const { colors } = useAppTheme();
  const { getCardioExercises, getRecentCardio } = useWorkoutStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [recent, setRecent] = useState<{ id: number; date: string; name: string; distance: number; durationSeconds: number }[]>([]);

  useFocusEffect(useCallback(() => {
    getCardioExercises().then(setExercises);
    getRecentCardio(20).then(setRecent);
  }, []));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Cardio" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="labelSmall" style={[styles.kicker, { color: colors.onSurfaceVariant }]}>START A SESSION</Text>
        <View style={styles.grid}>
          {exercises.map(ex => (
            <Pressable key={ex.id} onPress={() => router.push(`/fitness/active-workout?exerciseId=${ex.id}`)}
              style={[styles.tile, { backgroundColor: colors.surface }]}>
              <View style={[styles.tileIcon, { backgroundColor: withAlpha(accent, 0.14) }]}>
                <MaterialCommunityIcons name={iconFor(ex.name)} size={22} color={accent} />
              </View>
              <Text variant="labelMedium" numberOfLines={2} style={[styles.tileLabel, { color: colors.onSurface }]}>{ex.name}</Text>
            </Pressable>
          ))}
        </View>
        {exercises.length === 0 && (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            No cardio machines in your library yet.
          </Text>
        )}

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>Recent</Text>
        {recent.length === 0 ? (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>No cardio logged yet — start a session above.</Text>
        ) : recent.map(r => (
          <View key={r.id} style={[styles.row, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name={iconFor(r.name)} size={20} color={accent} />
            <View style={styles.rowInfo}>
              <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{r.name}</Text>
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{r.date.slice(5)}</Text>
            </View>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {r.distance ? `${r.distance} km` : ''}{r.distance && r.durationSeconds ? ' · ' : ''}{r.durationSeconds ? formatDuration(r.durationSeconds) : ''}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  kicker: { letterSpacing: 1, fontWeight: '300', marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tile: { width: '31%', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: 4, borderRadius: shape.md, gap: 6 },
  tileIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tileLabel: { textAlign: 'center' },
  sectionTitle: { fontWeight: '300', marginTop: spacing.sm, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: shape.sm, marginBottom: spacing.xs },
  rowInfo: { flex: 1 },
});
