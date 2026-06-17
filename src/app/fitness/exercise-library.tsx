import { useState, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface, Searchbar, Chip, TouchableRipple, Portal, Dialog, TextInput, Button, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing, shape, withAlpha } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
import { MUSCLES, EXERCISE_TYPES, exerciseType, formatMuscles, type ExerciseType } from '@/utils/muscles';

const GROUP_COLORS: Record<string, string> = {
  Chest: '#FF6584', Back: '#4FC3F7', Shoulders: '#FFB74D', Arms: '#B388FF',
  Legs: '#81C784', Glutes: '#F06292', Core: '#4DD0E1', Cardio: '#FF8A65',
};
const CUSTOM_GROUPS = ['Chest', 'Back', 'Shoulders', 'Legs', 'Glutes', 'Arms', 'Core', 'Cardio'];

export default function ExerciseLibraryScreen() {
  const { colors } = useAppTheme();
  const { selectFor } = useLocalSearchParams<{ selectFor?: string }>();
  const isSelectMode = !!selectFor;
  const { exercises, loadExercises, addExerciseToTemplate, addCustomExercise } = useWorkoutStore();
  const { profile, loadProfile } = useUserStore();

  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<string>('All');
  const [type, setType] = useState<ExerciseType | 'all'>('all');
  const [library, setLibrary] = useState<'all' | 'default' | 'custom'>('all');
  const [myGymOnly, setMyGymOnly] = useState(true);
  const [typeMenu, setTypeMenu] = useState(false);
  const [libMenu, setLibMenu] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGroup, setCustomGroup] = useState('Chest');

  const gymEquipment = profile?.equipment ?? [];
  const hasGym = gymEquipment.length > 0;

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { loadExercises('All', search); }, [search]);

  const available = (equipment: string) => !hasGym || gymEquipment.includes(equipment);

  const filtered = useMemo(() => exercises.filter(ex => {
    if (muscle !== 'All' && !ex.primaryMuscles.includes(muscle) && !ex.secondaryMuscles.includes(muscle)) return false;
    if (type !== 'all' && exerciseType(ex.mechanic, ex.region) !== type) return false;
    if (library === 'custom' && !ex.isCustom) return false;
    if (library === 'default' && ex.isCustom) return false;
    if (myGymOnly && hasGym && !ex.isCustom && !available(ex.equipment)) return false;
    return true;
  }), [exercises, muscle, type, library, myGymOnly, gymEquipment.join(',')]);

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

  const typeLabel = type === 'all' ? 'Type' : EXERCISE_TYPES.find(t => t.key === type)?.label ?? 'Type';
  const libLabel = library === 'all' ? 'Library' : library === 'custom' ? 'Custom' : 'Default';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={isSelectMode ? 'Add Exercise' : 'Exercises'}
        right={<IconButton icon="plus" onPress={() => setDialogVisible(true)} />}
      />

      <Searchbar placeholder="Search exercises..." value={search} onChangeText={setSearch} style={styles.searchbar} />

      {/* Muscle filter row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        <Chip selected={muscle === 'All'} onPress={() => setMuscle('All')} style={styles.chip} selectedColor={moduleColors.workout} compact>All</Chip>
        {MUSCLES.map(m => (
          <Chip key={m.key} selected={muscle === m.key} onPress={() => setMuscle(m.key)} style={styles.chip} selectedColor={moduleColors.workout} compact>
            {m.key}
          </Chip>
        ))}
      </ScrollView>

      {/* Dropdown filters + gym toggle */}
      <View style={styles.filterRow}>
        <Menu
          visible={typeMenu}
          onDismiss={() => setTypeMenu(false)}
          anchor={
            <Chip icon="filter-variant" onPress={() => setTypeMenu(true)} compact
              style={styles.filterPill} selected={type !== 'all'} selectedColor={moduleColors.workout}>
              {typeLabel}
            </Chip>
          }>
          <Menu.Item onPress={() => { setType('all'); setTypeMenu(false); }} title="Any" />
          {EXERCISE_TYPES.map(t => (
            <Menu.Item key={t.key} onPress={() => { setType(t.key); setTypeMenu(false); }} title={t.label} />
          ))}
        </Menu>

        <Menu
          visible={libMenu}
          onDismiss={() => setLibMenu(false)}
          anchor={
            <Chip icon="bookshelf" onPress={() => setLibMenu(true)} compact
              style={styles.filterPill} selected={library !== 'all'} selectedColor={moduleColors.workout}>
              {libLabel}
            </Chip>
          }>
          <Menu.Item onPress={() => { setLibrary('all'); setLibMenu(false); }} title="Any" />
          <Menu.Item onPress={() => { setLibrary('default'); setLibMenu(false); }} title="Default" />
          <Menu.Item onPress={() => { setLibrary('custom'); setLibMenu(false); }} title="Custom" />
        </Menu>

        {hasGym && (
          <Chip icon={myGymOnly ? 'dumbbell' : 'earth'} selected={myGymOnly} onPress={() => setMyGymOnly(v => !v)}
            style={styles.filterPill} selectedColor={moduleColors.workout} compact>
            My Gym
          </Chip>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text variant="labelSmall" style={[styles.count, { color: colors.onSurfaceVariant }]}>
          {filtered.length} exercise{filtered.length === 1 ? '' : 's'}
        </Text>
        {filtered.length === 0 ? (
          <Text variant="bodyMedium" style={styles.emptyText}>No exercises match these filters</Text>
        ) : (
          filtered.map(ex => {
            const grp = ex.muscleGroup;
            const tileColor = GROUP_COLORS[grp] ?? moduleColors.workout;
            const inGym = available(ex.equipment);
            const muscles = formatMuscles(ex.primaryMuscles, ex.secondaryMuscles);
            return (
              <TouchableRipple key={ex.id} onPress={() => handleSelect(ex.id)} style={styles.touchable} borderless>
                <Surface style={styles.exCard} elevation={1}>
                  <View style={[styles.tile, { backgroundColor: withAlpha(tileColor, 0.18) }]}>
                    <MaterialCommunityIcons name="arm-flex" size={20} color={tileColor} />
                  </View>
                  <View style={styles.exInfo}>
                    <Text variant="titleSmall" numberOfLines={2}>{ex.name}</Text>
                    {!!muscles && (
                      <Text variant="bodySmall" style={styles.exMeta} numberOfLines={2}>{muscles}</Text>
                    )}
                    <Text variant="labelSmall" style={[styles.exEquip, { color: colors.onSurfaceVariant }]}>
                      {ex.equipment}{ex.isCustom ? ' · Custom' : ''}
                      {hasGym && !ex.isCustom && !inGym ? ' · Not in your gym' : ''}
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
            );
          })
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Custom Exercise</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Exercise name" value={customName} onChangeText={setCustomName} mode="outlined" autoFocus style={styles.dialogInput} />
            <Text variant="labelMedium" style={styles.dialogLabel}>Muscle Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dialogChips}>
              {CUSTOM_GROUPS.map(g => (
                <Chip key={g} selected={customGroup === g} onPress={() => setCustomGroup(g)} style={styles.dialogChip} compact>{g}</Chip>
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
  searchbar: { marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: theme.colors.surface },
  chipScroll: { maxHeight: 44, flexGrow: 0 },
  chipRow: { paddingHorizontal: spacing.md, gap: spacing.xs, alignItems: 'center' },
  chip: { backgroundColor: theme.colors.surface },
  filterRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm },
  filterPill: { backgroundColor: theme.colors.surface },
  scrollContent: { padding: spacing.md, paddingTop: 0, paddingBottom: 40 },
  count: { marginBottom: spacing.sm },
  emptyText: { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xl },
  touchable: { borderRadius: shape.md, marginBottom: spacing.sm },
  exCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: shape.md, backgroundColor: theme.colors.surface, gap: spacing.sm },
  tile: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  exInfo: { flex: 1 },
  exMeta: { color: theme.colors.onSurfaceVariant, marginTop: 2 },
  exEquip: { marginTop: 2 },
  dialogInput: { marginBottom: spacing.sm },
  dialogLabel: { marginBottom: spacing.xs },
  dialogChips: { gap: spacing.xs, paddingVertical: spacing.xs },
  dialogChip: { backgroundColor: theme.colors.surfaceVariant },
});
