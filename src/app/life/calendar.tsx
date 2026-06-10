import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { getMarkedDates, getDaySummary, type MarkedDates, type DaySummary } from '@/services/calendarData';

const LEGEND = [
  { label: 'Meals', color: moduleColors.nutrition },
  { label: 'Workout', color: moduleColors.workout },
  { label: 'Tasks', color: moduleColors.tasks },
  { label: 'Habits', color: moduleColors.habits },
  { label: 'Budget', color: moduleColors.budget },
  { label: 'Sleep', color: moduleColors.sleep },
];

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export default function CalendarScreen() {
  const [marked, setMarked] = useState<MarkedDates>({});
  const [selected, setSelected] = useState<string>(today());
  const [summary, setSummary] = useState<DaySummary | null>(null);

  const refresh = useCallback(async () => {
    const m = await getMarkedDates();
    setMarked(m);
    setSummary(await getDaySummary(selected));
  }, [selected]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onDayPress = async (day: { dateString: string }) => {
    setSelected(day.dateString);
    setSummary(await getDaySummary(day.dateString));
  };

  const markedWithSelection = {
    ...marked,
    [selected]: {
      ...(marked[selected] || { dots: [] }),
      selected: true,
      selectedColor: theme.colors.primary,
    },
  };

  const formatDuration = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Calendar" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.calendarCard} elevation={1}>
          <Calendar
            onDayPress={onDayPress}
            markingType="multi-dot"
            markedDates={markedWithSelection}
            theme={{
              calendarBackground: theme.colors.surface,
              textSectionTitleColor: theme.colors.onSurfaceVariant,
              monthTextColor: theme.colors.onSurface,
              dayTextColor: theme.colors.onSurface,
              todayTextColor: theme.colors.primary,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: '#fff',
              arrowColor: theme.colors.primary,
              textDisabledColor: theme.colors.outline,
            }}
          />
        </Surface>

        <View style={styles.legend}>
          {LEGEND.map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text variant="labelSmall" style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>

        <Text variant="titleSmall" style={styles.sectionTitle}>{selected}</Text>

        {summary && (
          <View>
            <SummaryRow icon="food-apple" color={moduleColors.nutrition}
              text={summary.meals.count > 0 ? `${summary.meals.count} meals · ${summary.meals.calories} cal` : 'No meals logged'} />
            <SummaryRow icon="dumbbell" color={moduleColors.workout}
              text={summary.workouts.length > 0 ? summary.workouts.join(', ') : 'No workout'} />
            <SummaryRow icon="checkbox-marked-outline" color={moduleColors.tasks}
              text={summary.tasks.length > 0 ? `${summary.tasks.filter(t => t.completed).length}/${summary.tasks.length} tasks done` : 'No tasks due'} />
            <SummaryRow icon="repeat" color={moduleColors.habits}
              text={summary.habits > 0 ? `${summary.habits} habits completed` : 'No habits completed'} />
            <SummaryRow icon="wallet" color={moduleColors.budget}
              text={(summary.spending.income > 0 || summary.spending.expense > 0)
                ? `+$${summary.spending.income.toFixed(0)} / -$${summary.spending.expense.toFixed(0)}`
                : 'No transactions'} />
            <SummaryRow icon="moon-waning-crescent" color={moduleColors.sleep}
              text={summary.sleep ? formatDuration(summary.sleep) : 'No sleep logged'} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ icon, color, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; text: string }) {
  return (
    <Surface style={styles.summaryRow} elevation={0}>
      <View style={[styles.summaryIcon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text variant="bodyMedium" style={styles.summaryText}>{text}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  calendarCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.surface, padding: spacing.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', marginVertical: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: theme.colors.onSurfaceVariant },
  sectionTitle: { fontWeight: '700', marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: theme.colors.surface, borderRadius: 10, marginBottom: spacing.xs, gap: spacing.sm },
  summaryIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  summaryText: { flex: 1 },
});
