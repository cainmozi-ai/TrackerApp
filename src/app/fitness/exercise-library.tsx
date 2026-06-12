import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface, Searchbar, Chip, TouchableRipple, Portal, Dialog, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Glutes', 'Arms', 'Core', 'Cardio'];

export default function ExerciseLibraryScreen() {
  const { selectFor } = useLocalSearchParams<{ selectFor?: string }>();
  const isSelectMode = !!selectFor;
  const { exercises, loadExercises, addExerciseToTemplate, addCustomExercise } = useWorkoutStore();
  const { profile, loadProfile } = useUserStore();
  const [group, setGroup] = useState('All');
  const [search, setSearch] = useState('');
  const [myGymOnly, setMyGymOnly] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGroup, setCustomGroup] = useState('Chest');

  const gymEquipment = profile?.equipment ?? [];
  const equipmentFilter = myGymOnly && gymEquipment.length > 0 ? gymEquipment : undefined;

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    loadExercises(group, search, equipmentFilter);
  }, [group, search, myGymOnly, profile?.equipment?.join(',')]);

  const handleSelect = async (exerciseId: number) => {
    if (isSelectMode) {
      await addExerciseToTemplate(Number(selectFor), exerciseId, 3, 10, 0);
      router.back();
    } else {
      router.push(`/fitness/exercise-detail?id=${exerciseId}`);
    }
  };

  const handleAddCustom = async () => {
    if (!customName.trim()) return;
    await addCustomExercise(customName.trim(), customGroup, 'Other');
    setCustomName('');
    setDialogVisible(false);
  };

  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={isSelectMode ? 'Add Exercise' : 'Exercises'}
        right={<IconButton icon="plus" onPress={() => setDialogVisible(true)} />}
      />

      <Searchbar
        placeholder="Search exercises..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {gymEquipment.length > 0 && (
          <Chip
            icon={myGymOnly ? 'dumbbell' : 'earth'}
            selected={myGymOnly}
            onPress={() => setMyGymOnly(v => !v)}
            style={styles.chip}
            selectedColor={moduleColors.workout}
            showSelectedOverlay
          >
            My Gym
          </Chip>
        )}
        {MUSCLE_GROUPS.map(g => (
          <Chip
            key={g}
            selected={group === g}
            onPress={() => setGroup(g)}
            style={styles.chip}
            selectedColor={moduleColors.workout}
          >
            {g}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {exercises.length === 0 ? (
          <Text variant="bodyMedium" style={styles.emptyText}>No exercises found</Text>
        ) : (
          exercises.map((ex, i) => {
            // Section header whenever the target head changes (exercises arrive
            // sorted by muscle group then target, so heads cluster together).
            const prev = exercises[i - 1];
            const showHeader = group !== 'All' && !!ex.target && (!prev || prev.target !== ex.target);
            return (
              <View key={ex.id}>
                {showHeader && (
                  <Text variant="labelLarge" style={[styles.targetHeader, { color: moduleColors.workout }]}>
                    {ex.target}
                  </Text>
                )}
                <TouchableRipple
                  onPress={() => handleSelect(ex.id)}
                  style={styles.touchable}
                  borderless
                >
                  <Surface style={styles.exCard} elevation={1}>
                    <View style={styles.exInfo}>
                      <Text variant="titleSmall">{ex.name}</Text>
                      <Text variant="bodySmall" style={styles.exMeta}>
                        {group === 'All' && ex.target ? `${ex.target} · ` : ''}{ex.equipment}
                        {ex.isCustom ? ' · Custom' : ''}
                      </Text>
                    </View>
                    {isSelectMode ? (
                      <>
                        <IconButton icon="information-outline" size={20}
                          onPress={() => router.push(`/fitness/exercise-detail?id=${ex.id}`)} />
                        <MaterialCommunityIcons name="plus-circle" size={24} color={moduleColors.workout} />
                      </>
                    ) : (
                      <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
                    )}
                  </Surface>
                </TouchableRipple>
              </View>
            );
          })
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Custom Exercise</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Exercise name"
              value={customName}
              onChangeText={setCustomName}
              mode="outlined"
              autoFocus
              style={styles.dialogInput}
            />
            <Text variant="labelMedium" style={styles.dialogLabel}>Muscle Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dialogChips}>
              {MUSCLE_GROUPS.filter(g => g !== 'All').map(g => (
                <Chip key={g} selected={customGroup === g} onPress={() => setCustomGroup(g)} style={styles.dialogChip} compact>
                  {g}
                </Chip>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddCustom} disabled={!customName.trim()}>Add</Button>
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
  searchbar: { marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: theme.colors.surface },
  chipScroll: { maxHeight: 48, flexGrow: 0 },
  chipRow: { paddingHorizontal: spacing.md, gap: spacing.xs, alignItems: 'center' },
  chip: { backgroundColor: theme.colors.surface },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  emptyText: { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xl },
  touchable: { borderRadius: 12, marginBottom: spacing.sm },
  targetHeader: { fontWeight: '800', marginTop: spacing.sm, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  exCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  exInfo: { flex: 1 },
  exMeta: { color: theme.colors.onSurfaceVariant, marginTop: 2 },
  dialogInput: { marginBottom: spacing.sm },
  dialogLabel: { marginBottom: spacing.xs },
  dialogChips: { gap: spacing.xs, paddingVertical: spacing.xs },
  dialogChip: { backgroundColor: theme.colors.surfaceVariant },
});
