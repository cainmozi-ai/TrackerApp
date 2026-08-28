import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, Portal, Dialog, Button, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useReminderStore } from '@/stores/reminderStore';

const DAYS = [
  { dow: 1, label: 'Monday' },
  { dow: 2, label: 'Tuesday' },
  { dow: 3, label: 'Wednesday' },
  { dow: 4, label: 'Thursday' },
  { dow: 5, label: 'Friday' },
  { dow: 6, label: 'Saturday' },
  { dow: 0, label: 'Sunday' },
];

export default function WeeklySplitScreen() {
  const { colors } = useAppTheme();
  const { templates, loadTemplates, getWeeklySchedule, setDaySchedule } = useWorkoutStore();
  const [schedule, setSchedule] = useState<Record<number, number | null>>({});
  const [pickDay, setPickDay] = useState<number | null>(null);
  const todayDow = new Date().getDay();

  const refresh = useCallback(async () => {
    await loadTemplates();
    setSchedule(await getWeeklySchedule());
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const templateName = (id: number | null | undefined) =>
    id ? (templates.find(t => t.id === id)?.name ?? 'Routine') : null;

  const assign = async (dow: number, templateId: number | null) => {
    await setDaySchedule(dow, templateId);
    setSchedule(s => ({ ...s, [dow]: templateId }));
    setPickDay(null);
    // Keep the workout reminder in sync with the new split.
    await useReminderStore.getState().rescheduleWorkout();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Weekly Split" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Plan a routine for each day. Your split surfaces on the Fitness tab.
        </Text>
        {DAYS.map(d => {
          const name = templateName(schedule[d.dow]);
          const isToday = d.dow === todayDow;
          return (
            <Pressable key={d.dow} onPress={() => setPickDay(d.dow)}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: isToday ? accent : 'transparent', borderWidth: isToday ? 1.5 : 0 }]}>
              <View style={styles.dayCol}>
                <Text variant="titleSmall" style={{ color: isToday ? accent : colors.onSurface, fontWeight: '700' }}>{d.label}</Text>
                {isToday && <Text variant="labelSmall" style={{ color: accent }}>Today</Text>}
              </View>
              <Text variant="bodyMedium" style={{ color: name ? colors.onSurface : colors.onSurfaceVariant, flex: 1 }}>
                {name ?? 'Rest day'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          );
        })}
      </ScrollView>

      <Portal>
        <Dialog visible={pickDay !== null} onDismiss={() => setPickDay(null)}>
          <Dialog.Title>{pickDay !== null ? DAYS.find(d => d.dow === pickDay)?.label : ''}</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.pickList}>
              <TouchableRipple onPress={() => pickDay !== null && assign(pickDay, null)} style={styles.item}>
                <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant }}>Rest day</Text>
              </TouchableRipple>
              {templates.map(t => (
                <TouchableRipple key={t.id} onPress={() => pickDay !== null && assign(pickDay, t.id)} style={styles.item}>
                  <Text variant="bodyLarge" style={{ color: colors.onSurface }}>{t.name}</Text>
                </TouchableRipple>
              ))}
              {templates.length === 0 && (
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, padding: spacing.sm }}>
                  No routines yet — create one in My Routines first.
                </Text>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions><Button onPress={() => setPickDay(null)}>Close</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  subtitle: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: shape.md, marginBottom: spacing.sm },
  dayCol: { width: 96 },
  pickList: { maxHeight: 340 },
  item: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
});
