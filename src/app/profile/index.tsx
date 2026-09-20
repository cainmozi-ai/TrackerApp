import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, Surface, TextInput, Button, SegmentedButtons, Snackbar, TouchableRipple, Switch, Chip, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useUserStore, getLevelName, getXpForCurrentLevel, getXpForNextLevel } from '@/stores/userStore';
import { EQUIPMENT_GROUPS } from '@/stores/workoutStore';
import { exportBackup, pickBackupFile, importBackup } from '@/services/backup';

export default function ProfileScreen() {
  const { profile, loadProfile, updateProfile } = useUserStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [calorieTarget, setCalorieTarget] = useState('');
  const [proteinTarget, setProteinTarget] = useState('');
  const [proteinMin, setProteinMin] = useState('');
  const [proteinMax, setProteinMax] = useState('');
  const [carbsTarget, setCarbsTarget] = useState('');
  const [carbsMin, setCarbsMin] = useState('');
  const [carbsMax, setCarbsMax] = useState('');
  const [fatTarget, setFatTarget] = useState('');
  const [fatMin, setFatMin] = useState('');
  const [fatMax, setFatMax] = useState('');
  const [fiberTarget, setFiberTarget] = useState('');
  const [fiberMin, setFiberMin] = useState('');
  const [fiberMax, setFiberMax] = useState('');
  const [sugarTarget, setSugarTarget] = useState('');
  const [sugarMin, setSugarMin] = useState('');
  const [sugarMax, setSugarMax] = useState('');
  const [sodiumTarget, setSodiumTarget] = useState('');
  const [waterTarget, setWaterTarget] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState(false);
  const [backupSnack, setBackupSnack] = useState('');
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportBackup();
      setBackupSnack('Backup exported — keep that file somewhere safe');
    } catch (e) {
      setBackupSnack(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const handlePickImport = async () => {
    try {
      const json = await pickBackupFile();
      if (json) setPendingImport(json);
    } catch {
      setBackupSnack("Couldn't read that file");
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setBusy(true);
    try {
      const result = await importBackup(pendingImport);
      setPendingImport(null);
      await loadProfile();
      setBackupSnack(`Restored ${result.rows} records across ${result.tables} tables`);
    } catch (e) {
      setPendingImport(null);
      setBackupSnack(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const toggleEquipment = (item: string) => {
    setEquipment(prev => prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]);
  };

  const toggleCategory = (items: string[]) => {
    setEquipment(prev => {
      const allSelected = items.every(i => prev.includes(i));
      if (allSelected) return prev.filter(e => !items.includes(e));
      return Array.from(new Set([...prev, ...items]));
    });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age ? String(profile.age) : '');
      setWeight(profile.weight ? String(profile.weight) : '');
      setHeight(profile.height ? String(profile.height) : '');
      setCalorieTarget(String(profile.calorieTarget));
      setProteinTarget(String(profile.proteinTarget));
      setProteinMin(profile.proteinTargetMin == null ? '' : String(profile.proteinTargetMin));
      setProteinMax(profile.proteinTargetMax == null ? '' : String(profile.proteinTargetMax));
      setCarbsTarget(String(profile.carbsTarget));
      setCarbsMin(profile.carbsTargetMin == null ? '' : String(profile.carbsTargetMin));
      setCarbsMax(profile.carbsTargetMax == null ? '' : String(profile.carbsTargetMax));
      setFatTarget(String(profile.fatTarget));
      setFatMin(profile.fatTargetMin == null ? '' : String(profile.fatTargetMin));
      setFatMax(profile.fatTargetMax == null ? '' : String(profile.fatTargetMax));
      setFiberTarget(String(profile.fiberTarget));
      setFiberMin(profile.fiberTargetMin == null ? '' : String(profile.fiberTargetMin));
      setFiberMax(profile.fiberTargetMax == null ? '' : String(profile.fiberTargetMax));
      setSugarTarget(String(profile.sugarTarget));
      setSugarMin(profile.sugarTargetMin == null ? '' : String(profile.sugarTargetMin));
      setSugarMax(profile.sugarTargetMax == null ? '' : String(profile.sugarTargetMax));
      setSodiumTarget(String(profile.sodiumTarget));
      setWaterTarget(String(profile.waterTarget));
      setMonthlyBudget(profile.monthlyBudget ? String(profile.monthlyBudget) : '');
      setWeightUnit(profile.weightUnit);
      setEquipment(profile.equipment);
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile({
      name: name.trim() || null,
      age: age ? parseInt(age) : null,
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      calorieTarget: parseInt(calorieTarget) || 2000,
      proteinTarget: parseInt(proteinTarget) || 150,
      proteinTargetMin: proteinMin ? parseInt(proteinMin) : null,
      proteinTargetMax: proteinMax ? parseInt(proteinMax) : null,
      carbsTarget: parseInt(carbsTarget) || 250,
      carbsTargetMin: carbsMin ? parseInt(carbsMin) : null,
      carbsTargetMax: carbsMax ? parseInt(carbsMax) : null,
      fatTarget: parseInt(fatTarget) || 65,
      fatTargetMin: fatMin ? parseInt(fatMin) : null,
      fatTargetMax: fatMax ? parseInt(fatMax) : null,
      fiberTarget: parseInt(fiberTarget) || 30,
      fiberTargetMin: fiberMin ? parseInt(fiberMin) : null,
      fiberTargetMax: fiberMax ? parseInt(fiberMax) : null,
      sugarTarget: parseInt(sugarTarget) || 50,
      sugarTargetMin: sugarMin ? parseInt(sugarMin) : null,
      sugarTargetMax: sugarMax ? parseInt(sugarMax) : null,
      sodiumTarget: parseInt(sodiumTarget) || 2300,
      waterTarget: parseInt(waterTarget) || 8,
      monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
      weightUnit: weightUnit as 'kg' | 'lbs',
      equipment,
    });
    setSnackbar(true);
  };

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpCurrent = getXpForCurrentLevel(level);
  const xpNext = getXpForNextLevel(level);
  const xpProgress = xpNext > xpCurrent ? (xp - xpCurrent) / (xpNext - xpCurrent) : 1;

  const { colors, dark, toggle } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.levelCard} elevation={1}>
          <View style={styles.levelTop}>
            <View style={styles.levelBadge}>
              <MaterialCommunityIcons name="star-four-points" size={24} color={moduleColors.gamification} />
              <Text variant="titleLarge" style={styles.levelNum}>Lv. {level}</Text>
            </View>
            <Text variant="titleMedium" style={styles.levelName}>{getLevelName(level)}</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
          </View>
          <Text variant="labelSmall" style={styles.xpText}>
            {xp} XP {xpNext > xpCurrent ? `· ${xpNext - xp} to next level` : ''}
          </Text>
          <TouchableRipple onPress={() => router.push('/profile/achievements')} style={styles.achievementsLink}>
            <View style={styles.achievementsRow}>
              <MaterialCommunityIcons name="trophy" size={20} color={moduleColors.gamification} />
              <Text variant="bodyMedium" style={styles.achievementsText}>View Achievements</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
            </View>
          </TouchableRipple>
        </Surface>

        <Text variant="titleSmall" style={styles.sectionTitle}>Appearance</Text>
        <Surface style={[styles.appearanceRow, { backgroundColor: colors.surface }]} elevation={1}>
          <MaterialCommunityIcons name={dark ? 'weather-night' : 'white-balance-sunny'} size={22} color={colors.primary} />
          <Text variant="bodyLarge" style={[styles.appearanceLabel, { color: colors.onSurface }]}>Dark Mode</Text>
          <Switch value={dark} onValueChange={toggle} color={colors.primary} />
        </Surface>

        <Text variant="titleSmall" style={styles.sectionTitle}>Notifications</Text>
        <TouchableRipple onPress={() => router.push('/profile/reminders')} style={styles.linkRow} borderless>
          <View style={styles.linkRowInner}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyLarge" style={{ color: colors.onSurface }}>Reminders</Text>
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Workout, habit, hydration & streak nudges</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
          </View>
        </TouchableRipple>

        <Text variant="titleSmall" style={styles.sectionTitle}>About You</Text>
        <TextInput label="Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
        <View style={styles.row}>
          <TextInput label="Age" value={age} onChangeText={setAge} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
          <TextInput label={`Weight (${weightUnit})`} value={weight} onChangeText={setWeight} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
          <TextInput label="Height (cm)" value={height} onChangeText={setHeight} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
        </View>

        <Text variant="labelLarge" style={styles.label}>Weight Unit</Text>
        <SegmentedButtons
          value={weightUnit}
          onValueChange={setWeightUnit}
          buttons={[{ value: 'kg', label: 'kg' }, { value: 'lbs', label: 'lbs' }]}
          style={styles.segmented}
        />

        <Text variant="titleSmall" style={styles.sectionTitle}>My Gym Equipment</Text>
        <Text variant="bodySmall" style={styles.equipmentHint}>
          Pick what your gym has — exercise lists can then filter to moves you can actually do. Tap a category name to select the whole category. Leave empty to always show everything.
        </Text>
        {EQUIPMENT_GROUPS.map(group => {
          const allOn = group.items.every(i => equipment.includes(i));
          return (
            <View key={group.label}>
              <Pressable onPress={() => toggleCategory(group.items)} style={styles.equipCatRow}>
                <Text variant="labelLarge" style={[styles.equipCatLabel, allOn && { color: theme.colors.primary }]}>
                  {group.label}
                </Text>
                <Text variant="labelSmall" style={styles.equipCatHint}>
                  {allOn ? 'all selected — tap to clear' : 'tap to select all'}
                </Text>
              </Pressable>
              <View style={styles.equipmentWrap}>
                {group.items.map(item => (
                  <Chip
                    key={item}
                    selected={equipment.includes(item)}
                    onPress={() => toggleEquipment(item)}
                    showSelectedOverlay
                    compact
                    style={styles.equipmentChip}
                  >
                    {item}
                  </Chip>
                ))}
              </View>
            </View>
          );
        })}

        <Text variant="titleSmall" style={styles.sectionTitle}>Daily Targets</Text>
        <TextInput label="Calorie target" value={calorieTarget} onChangeText={setCalorieTarget} mode="outlined" keyboardType="numeric" style={styles.input} />
        <View style={styles.row}>
          <TextInput label="Protein (g)" value={proteinTarget} onChangeText={setProteinTarget} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
          <TextInput label="Carbs (g)" value={carbsTarget} onChangeText={setCarbsTarget} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
          <TextInput label="Fat (g)" value={fatTarget} onChangeText={setFatTarget} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
        </View>
        <MacroRange label="Protein range" min={proteinMin} max={proteinMax} setMin={setProteinMin} setMax={setProteinMax} />
        <MacroRange label="Carbs range" min={carbsMin} max={carbsMax} setMin={setCarbsMin} setMax={setCarbsMax} />
        <MacroRange label="Fat range" min={fatMin} max={fatMax} setMin={setFatMin} setMax={setFatMax} />
        <View style={styles.row}>
          <TextInput label="Fiber (g)" value={fiberTarget} onChangeText={setFiberTarget} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
          <TextInput label="Sugar (g)" value={sugarTarget} onChangeText={setSugarTarget} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
          <TextInput label="Sodium (mg)" value={sodiumTarget} onChangeText={setSodiumTarget} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
        </View>
        <MacroRange label="Fiber range" min={fiberMin} max={fiberMax} setMin={setFiberMin} setMax={setFiberMax} />
        <MacroRange label="Sugar range" min={sugarMin} max={sugarMax} setMin={setSugarMin} setMax={setSugarMax} />
        <View style={styles.row}>
          <TextInput label="Water (glasses)" value={waterTarget} onChangeText={setWaterTarget} mode="outlined" keyboardType="numeric" style={styles.halfInput} />
          <TextInput label="Monthly budget ($)" value={monthlyBudget} onChangeText={setMonthlyBudget} mode="outlined" keyboardType="numeric" style={styles.halfInput} />
        </View>

        <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
          Save Changes
        </Button>

        <Text variant="titleSmall" style={styles.sectionTitle}>Data & Backup</Text>
        <Text variant="bodySmall" style={styles.equipmentHint}>
          Your data lives on this device and survives app updates. Export a backup before switching phones or uninstalling — progress photos aren't included, only their dates.
        </Text>
        <View style={styles.row}>
          <Button mode="contained-tonal" icon="export" style={styles.halfInput} onPress={handleExport} disabled={busy} loading={busy}>
            Export Data
          </Button>
          <Button mode="outlined" icon="import" style={styles.halfInput} onPress={handlePickImport} disabled={busy}>
            Import Data
          </Button>
        </View>

        <Text variant="labelSmall" style={styles.version}>Incus v1.0.0</Text>
      </ScrollView>

      <Portal>
        <Dialog visible={!!pendingImport} onDismiss={() => setPendingImport(null)}>
          <Dialog.Title>Restore backup?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              This replaces everything currently in the app — meals, workouts, habits, settings — with the contents of the backup file. This can't be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPendingImport(null)}>Cancel</Button>
            <Button onPress={handleConfirmImport} loading={busy}>Restore</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={snackbar} onDismiss={() => setSnackbar(false)} duration={2000}>
        Profile saved!
      </Snackbar>
      <Snackbar visible={!!backupSnack} onDismiss={() => setBackupSnack('')} duration={3500}>
        {backupSnack}
      </Snackbar>
    </SafeAreaView>
  );
}

function MacroRange({ label, min, max, setMin, setMax }: { label: string; min: string; max: string; setMin: (value: string) => void; setMax: (value: string) => void }) {
  return (
    <View style={styles.rangeRow}>
      <Text variant="labelMedium" style={styles.rangeLabel}>{label}</Text>
      <TextInput label="Min" value={min} onChangeText={setMin} mode="outlined" keyboardType="numeric" style={styles.rangeInput} dense />
      <TextInput label="Max" value={max} onChangeText={setMax} mode="outlined" keyboardType="numeric" style={styles.rangeInput} dense />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  levelCard: { padding: spacing.lg, borderRadius: 16, backgroundColor: theme.colors.surface, marginBottom: spacing.md },
  levelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  levelNum: { fontWeight: '700' },
  levelName: { color: moduleColors.gamification, fontWeight: '600' },
  xpTrack: { height: 8, backgroundColor: theme.colors.surfaceVariant, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  xpText: { color: theme.colors.onSurfaceVariant, marginTop: 4 },
  achievementsLink: { marginTop: spacing.md, borderRadius: 10 },
  achievementsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  achievementsText: { flex: 1, fontWeight: '500' },
  sectionTitle: { fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  appearanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 16 },
  linkRow: { borderRadius: 16 },
  linkRowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  appearanceLabel: { flex: 1, fontWeight: '500' },
  input: { marginBottom: spacing.sm, backgroundColor: theme.colors.surface },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  thirdInput: { flex: 1, backgroundColor: theme.colors.surface },
  halfInput: { flex: 1, backgroundColor: theme.colors.surface },
  label: { marginBottom: spacing.sm, fontWeight: '600' },
  equipmentHint: { color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm },
  equipmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  equipmentChip: { backgroundColor: theme.colors.surface },
  equipCatRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.xs },
  equipCatLabel: { fontWeight: '700' },
  equipCatHint: { color: theme.colors.onSurfaceVariant },
  segmented: { marginBottom: spacing.sm },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  rangeLabel: { flex: 1, color: theme.colors.onSurfaceVariant },
  rangeInput: { width: 78, backgroundColor: theme.colors.surface },
  saveBtn: { marginTop: spacing.lg },
  version: { textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: spacing.lg },
});
