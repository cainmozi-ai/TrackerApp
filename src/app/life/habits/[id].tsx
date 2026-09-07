import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { useHabitStore } from '@/stores/habitStore';
import { HabitHeatmap } from '@/components/habits/HabitHeatmap';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = Number(id);
  const { habits, loadHabits, getStreak, getHeatmapData, deleteHabit } = useHabitStore();
  const [streak, setStreak] = useState(0);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});

  const habit = habits.find(h => h.id === habitId);

  const refresh = useCallback(async () => {
    if (habits.length === 0) await loadHabits();
    setStreak(await getStreak(habitId));
    setHeatmap(await getHeatmapData(habitId, 90));
  }, [habitId, habits.length]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const totalCompletions = Object.values(heatmap).reduce((s, v) => s + v, 0);
  const completionRate = Math.round((totalCompletions / 90) * 100);

  const handleDelete = async () => {
    await deleteHabit(habitId);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="titleLarge" style={styles.title} numberOfLines={1}>{habit?.name || 'Habit'}</Text>
        <IconButton icon="delete-outline" onPress={handleDelete} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsRow}>
          <Surface style={styles.statCard} elevation={1}>
            <MaterialCommunityIcons name="fire" size={28} color="#FF7043" />
            <Text variant="headlineSmall" style={styles.statValue}>{streak}</Text>
            <Text variant="labelSmall" style={styles.statLabel}>day streak</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={1}>
            <MaterialCommunityIcons name="check-all" size={28} color={moduleColors.habits} />
            <Text variant="headlineSmall" style={styles.statValue}>{totalCompletions}</Text>
            <Text variant="labelSmall" style={styles.statLabel}>completions</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={1}>
            <MaterialCommunityIcons name="percent" size={28} color={moduleColors.tasks} />
            <Text variant="headlineSmall" style={styles.statValue}>{completionRate}</Text>
            <Text variant="labelSmall" style={styles.statLabel}>% (90d)</Text>
          </Surface>
        </View>

        <Text variant="titleSmall" style={styles.sectionTitle}>Last 90 Days</Text>
        <Surface style={styles.heatmapCard} elevation={1}>
          <HabitHeatmap data={heatmap} color={moduleColors.habits} />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700', flex: 1, textAlign: 'center' },
  scrollContent: { padding: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: 16, backgroundColor: theme.colors.surface, gap: 2 },
  statValue: { fontWeight: '700' },
  statLabel: { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  sectionTitle: { fontWeight: '600', marginBottom: spacing.sm },
  heatmapCard: { padding: spacing.md, borderRadius: 16, backgroundColor: theme.colors.surface },
});
