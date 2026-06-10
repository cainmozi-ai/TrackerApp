import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Surface, TextInput, Button, SegmentedButtons, Snackbar, TouchableRipple, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useUserStore, getLevelName, getXpForCurrentLevel, getXpForNextLevel } from '@/stores/userStore';

export default function ProfileScreen() {
  const { profile, loadProfile, updateProfile } = useUserStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [calorieTarget, setCalorieTarget] = useState('');
  const [proteinTarget, setProteinTarget] = useState('');
  const [carbsTarget, setCarbsTarget] = useState('');
  const [fatTarget, setFatTarget] = useState('');
  const [waterTarget, setWaterTarget] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [snackbar, setSnackbar] = useState(false);

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
      setCarbsTarget(String(profile.carbsTarget));
      setFatTarget(String(profile.fatTarget));
      setWaterTarget(String(profile.waterTarget));
      setMonthlyBudget(profile.monthlyBudget ? String(profile.monthlyBudget) : '');
      setWeightUnit(profile.weightUnit);
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
      carbsTarget: parseInt(carbsTarget) || 250,
      fatTarget: parseInt(fatTarget) || 65,
      waterTarget: parseInt(waterTarget) || 8,
      monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
      weightUnit: weightUnit as 'kg' | 'lbs',
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

        <Text variant="titleSmall" style={styles.sectionTitle}>Daily Targets</Text>
        <TextInput label="Calorie target" value={calorieTarget} onChangeText={setCalorieTarget} mode="outlined" keyboardType="numeric" style={styles.input} />
        <View style={styles.row}>
          <TextInput label="Protein (g)" value={proteinTarget} onChangeText={setProteinTarget} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
          <TextInput label="Carbs (g)" value={carbsTarget} onChangeText={setCarbsTarget} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
          <TextInput label="Fat (g)" value={fatTarget} onChangeText={setFatTarget} mode="outlined" keyboardType="numeric" style={styles.thirdInput} />
        </View>
        <View style={styles.row}>
          <TextInput label="Water (glasses)" value={waterTarget} onChangeText={setWaterTarget} mode="outlined" keyboardType="numeric" style={styles.halfInput} />
          <TextInput label="Monthly budget ($)" value={monthlyBudget} onChangeText={setMonthlyBudget} mode="outlined" keyboardType="numeric" style={styles.halfInput} />
        </View>

        <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
          Save Changes
        </Button>

        <Text variant="labelSmall" style={styles.version}>Life Tracker v1.0.0</Text>
      </ScrollView>

      <Snackbar visible={snackbar} onDismiss={() => setSnackbar(false)} duration={2000}>
        Profile saved!
      </Snackbar>
    </SafeAreaView>
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
  appearanceLabel: { flex: 1, fontWeight: '500' },
  input: { marginBottom: spacing.sm, backgroundColor: theme.colors.surface },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  thirdInput: { flex: 1, backgroundColor: theme.colors.surface },
  halfInput: { flex: 1, backgroundColor: theme.colors.surface },
  label: { marginBottom: spacing.sm, fontWeight: '600' },
  segmented: { marginBottom: spacing.sm },
  saveBtn: { marginTop: spacing.lg },
  version: { textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: spacing.lg },
});
