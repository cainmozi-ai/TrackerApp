import { useState, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface, Searchbar, Chip, TouchableRipple, Portal, Dialog, TextInput, Button, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { moduleColors, spacing, shape, withAlpha, type AppColors } from '@/theme';
import { useAppTheme, useThemedStyles } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Pill } from '@/components/common/Pill';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserStore } from '@/stores/userStore';
import { EXERCISE_TYPES, exerciseType, formatMuscles, type ExerciseType, groupColor } from '@/utils/muscles';

const CUSTOM_GROUPS = ['Chest', 'Back', 'Shoulders', 'Legs', 'Glutes', 'Arms', 'Core', 'Cardio'];

export default function ExerciseLibraryScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { selectFor } = useLocalSearchParams<{ selectFor?: string }>();
  const isSelectMode = !!selectFor;
  const { exercises, loadExercises, addExerciseToTemplate, addCustomExercise } = useWorkoutStore();
  const { profile, loadProfile } = useUserStore();

  const [search, setSearch] = useState('');
  // The design filters by muscle group (Chest, Back, …), not individual muscles.
  const [group, setGroup] = useState<string>('All');
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
    if (group !== 'All' && ex.muscleGroup !== group) return false;
    if (type !== 'all' && exerciseType(ex.mechanic, ex.region) !== type) return false;
    if (library === 'custom' && !ex.isCustom) return false;
    if (library === 'default' && ex.isCustom) return false;
    if (myGymOnly && hasGym && !ex.isCustom && !available(ex.equipment)) return false;
    return true;
  }), [exercises, group, type, library, myGymOnly, gymEquipment.join(',')]);

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
        <Pill label="All" selected={group === 'All'} onPress={() => setGroup('All')} />
        {CUSTOM_GROUPS.map(g => (
          <Pill key={g} label={g} selected={group === g} onPress={() => setGroup(g)} />
        ))}
      </ScrollView>

      {/* Dropdown filters + gym toggle */}
      <View style={styles.filterRow}>
        <Menu
          visible={typeMenu}
          onDismiss={() => setTypeMenu(false)}
          anchor={
            <Chip icon="filter-variant" onPress={() => setTypeMenu(true)} compact
              style={styles.filterPill} selected={type !== 'all'} selectedColor={type !== 'all' ? colors.accentText : colors.onSurface}>
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
              style={styles.filterPill} selected={library !== 'all'} selectedColor={library !== 'all' ? colors.accentText : colors.onSurface}>
              {libLabel}
            </Chip>
          }>
          <Menu.Item onPress={() => { setLibrary('all'); setLibMenu(false); }} title="Any" />
          <Menu.Item onPress={() => { setLibrary('default'); setLibMenu(false); }} title="Default" />
          <Menu.Item onPress={() => { setLibrary('custom'); setLibMenu(false); }} title="Custom" />
        </Menu>

        {hasGym && (
          <Chip icon={myGymOnly ? 'dumbbell' : 'earth'} selected={myGymOnly} onPress={() => setMyGymOnly(v => !v)}
            style={styles.filterPill} selectedColor={myGymOnly ? colors.accentText : colors.onSurface} compact>
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
            const tileColor = groupColor(grp);
            const inGym = available(ex.equipment);
            const muscles = formatMuscles(ex.primaryMuscles, ex.secondaryMuscles);
            return (
              <TouchableRipple key={ex.id} onPress={() => handleSelect(ex.id)} style={styles.touchable} borderless>
                <Surface style={styles.exCard} elevation={1}>
                  <View style={[styles.tile, { backgroundColor: withAlpha(tileColor, 0.18) }]}>
                    <View style={[styles.tileDot, { backgroundColor: tileColor }]} />
                  </View>
                  <View style={styles.exInfo}>
                    <Text variant="titleSmall" numberOfLines={2}>{ex.name}</Text>
                    {!!ex.target && (
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1}>{ex.target}</Text>
                    )}
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
                    <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
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
                <Pill key={g} label={g} selected={customGroup === g} onPress={() => setCustomGroup(g)} compact style={styles.dialogChip} />
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

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchbar: { marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface },
  // flexShrink 0: otherwise the list below squeezes this row down to a sliver.
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chipRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.sm, alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm },
  filterPill: { backgroundColor: colors.surfaceVariant },
  scrollContent: { padding: spacing.md, paddingTop: 0, paddingBottom: 40 },
  count: { marginBottom: spacing.sm },
  emptyText: { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xl },
  touchable: { borderRadius: shape.md, marginBottom: spacing.sm },
  exCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: shape.md, backgroundColor: colors.surface, gap: spacing.sm },
  tile: { width: 40, height: 40, borderRadius: shape.md, justifyContent: 'center', alignItems: 'center' },
  tileDot: { width: 16, height: 16, borderRadius: 8 },
  exInfo: { flex: 1 },
  exMeta: { color: colors.onSurfaceVariant, marginTop: 2 },
  exEquip: { marginTop: 2 },
  dialogInput: { marginBottom: spacing.sm },
  dialogLabel: { marginBottom: spacing.xs },
  dialogChips: { gap: spacing.xs, paddingVertical: spacing.xs },
  dialogChip: { marginRight: spacing.xs },
});
