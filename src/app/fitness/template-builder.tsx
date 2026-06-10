import { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface, FAB, Portal, Dialog, TextInput, Button, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { WorkoutLog } from '@/types';

export default function RoutinesScreen() {
  const { templates, loadTemplates, createTemplate, getActiveWorkout, discardWorkout } = useWorkoutStore();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [existing, setExisting] = useState<WorkoutLog | null>(null);
  const [guard, setGuard] = useState(false);

  const onStartEmpty = async () => {
    const active = await getActiveWorkout();
    if (active) { setExisting(active); setGuard(true); return; }
    router.push('/fitness/active-workout');
  };

  const startEmptyNew = async () => {
    setGuard(false);
    if (existing) await discardWorkout(existing.id);
    router.push('/fitness/active-workout');
  };

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [])
  );

  useEffect(() => {
    (async () => {
      const result: Record<number, number> = {};
      for (const t of templates) {
        const ex = await useWorkoutStore.getState().getTemplateExercises(t.id);
        result[t.id] = ex.length;
      }
      setCounts(result);
    })();
  }, [templates]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = await createTemplate(newName.trim());
    setNewName('');
    setDialogVisible(false);
    router.push(`/fitness/template/${id}`);
  };

  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="My Routines" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Button
          mode="contained-tonal"
          icon="play"
          style={styles.emptyWorkoutBtn}
          onPress={onStartEmpty}
        >
          Start Empty Workout
        </Button>

        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-list" size={56} color={moduleColors.workout} />
            <Text variant="bodyMedium" style={styles.emptyText}>
              No routines yet. Tap + to create one.
            </Text>
          </View>
        ) : (
          templates.map(t => (
            <TouchableRipple
              key={t.id}
              onPress={() => router.push(`/fitness/template/${t.id}`)}
              style={styles.touchable}
              borderless
            >
              <Surface style={styles.card} elevation={1}>
                <View style={[styles.iconBox, { backgroundColor: moduleColors.workout + '20' }]}>
                  <MaterialCommunityIcons name="dumbbell" size={22} color={moduleColors.workout} />
                </View>
                <View style={styles.cardContent}>
                  <Text variant="titleMedium">{t.name}</Text>
                  {!!t.description && (
                    <Text variant="bodySmall" style={styles.cardDesc}>{t.description}</Text>
                  )}
                  <Text variant="labelSmall" style={styles.exCount}>
                    {counts[t.id] ?? 0} exercises
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
              </Surface>
            </TouchableRipple>
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>New Routine</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Routine name"
              value={newName}
              onChangeText={setNewName}
              mode="outlined"
              placeholder="e.g., Upper Body A"
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreate} disabled={!newName.trim()}>Create</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={guard} onDismiss={() => setGuard(false)}>
          <Dialog.Title>Workout in progress</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              You already have a workout in progress. Resume it, or discard it and start a new empty workout?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.error} onPress={startEmptyNew}>Discard & new</Button>
            <Button onPress={() => { setGuard(false); if (existing) router.push(`/fitness/active-workout?workoutId=${existing.id}`); }}>Resume</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB icon="plus" style={styles.fab} color="#fff" onPress={() => setDialogVisible(true)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  emptyWorkoutBtn: { marginBottom: spacing.md },
  emptyState: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  emptyText: { color: theme.colors.onSurfaceVariant },
  touchable: { borderRadius: 16, marginBottom: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    gap: spacing.md,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardDesc: { color: theme.colors.onSurfaceVariant, marginTop: 1 },
  exCount: { color: moduleColors.workout, marginTop: 2 },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: moduleColors.workout, borderRadius: 28 },
});
