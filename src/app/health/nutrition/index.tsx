import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, FAB, IconButton, Portal, Dialog, TextInput, Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, moduleColors, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ProgressRing } from '@/components/common/ProgressRing';
import { MotionCard } from '@/components/common/MotionCard';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import type { MealType } from '@/types';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_ICONS: Record<MealType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  breakfast: 'weather-sunny',
  lunch: 'white-balance-sunny',
  dinner: 'weather-night',
  snack: 'cookie',
};

export default function NutritionScreen() {
  const { colors } = useAppTheme();
  const { todayLogs, todayCalories, todayProtein, todayCarbs, todayFat, loadTodayLogs, deleteLog, copyYesterday, saveMealFromDay } = useNutritionStore();
  const { profile, loadProfile } = useUserStore();
  const [saveDialog, setSaveDialog] = useState(false);
  const [mealName, setMealName] = useState('');
  const [snack, setSnack] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadTodayLogs();
      loadProfile();
    }, [])
  );

  const calorieTarget = profile?.calorieTarget || 2000;
  const proteinTarget = profile?.proteinTarget || 150;
  const carbsTarget = profile?.carbsTarget || 250;
  const fatTarget = profile?.fatTarget || 65;
  const diff = calorieTarget - todayCalories;
  const over = diff < 0;

  const getMealLogs = (meal: MealType) => todayLogs.filter(l => l.mealType === meal);

  const handleCopyYesterday = async () => {
    const count = await copyYesterday();
    setSnack(count > 0 ? `Copied ${count} item${count > 1 ? 's' : ''} from yesterday` : 'Nothing logged yesterday');
  };

  const handleSaveMeal = async () => {
    if (!mealName.trim()) return;
    await saveMealFromDay(mealName.trim());
    setMealName('');
    setSaveDialog(false);
    setSnack('Saved as a meal you can re-log anytime');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Nutrition" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MotionCard style={styles.hero} noEnter>
          <View style={styles.heroRow}>
            <ProgressRing
              progress={todayCalories / calorieTarget}
              size={104}
              strokeWidth={11}
              color={moduleColors.nutrition}
              value={String(todayCalories)}
              label="eaten"
            />
            <View style={styles.macroColumn}>
              <View style={styles.remainingRow}>
                <Text variant="headlineSmall" style={[styles.remaining, { color: colors.onSurface }]}>{Math.abs(diff)}</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}> {over ? 'kcal over' : 'kcal left'}</Text>
              </View>
              <MacroBar label="Protein" current={todayProtein} target={proteinTarget} color="#FF6584" />
              <MacroBar label="Carbs" current={todayCarbs} target={carbsTarget} color="#4FC3F7" />
              <MacroBar label="Fat" current={todayFat} target={fatTarget} color="#FFB74D" />
            </View>
          </View>
        </MotionCard>

        <View style={styles.actionRow}>
          <Button mode="contained-tonal" icon="content-copy" compact style={styles.actionBtn} onPress={handleCopyYesterday}>
            Copy Yesterday
          </Button>
          <Button mode="contained-tonal" icon="bookmark-plus" compact style={styles.actionBtn}
            onPress={() => setSaveDialog(true)} disabled={todayLogs.length === 0}>
            Save as Meal
          </Button>
        </View>

        {MEAL_ORDER.map((meal, i) => {
          const logs = getMealLogs(meal);
          const cals = logs.reduce((s, l) => s + (l.food?.calories || 0) * l.servings, 0);
          return (
            <MotionCard key={meal} index={i} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <MaterialCommunityIcons name={MEAL_ICONS[meal]} size={20} color={moduleColors.nutrition} />
                <Text variant="titleSmall" style={[styles.mealTitle, { color: colors.onSurface }]}>
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </Text>
                <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{Math.round(cals)} cal</Text>
                <IconButton
                  icon="plus"
                  size={18}
                  mode="contained-tonal"
                  containerColor={withAlpha(moduleColors.nutrition, 0.16)}
                  iconColor={moduleColors.nutrition}
                  style={styles.addBtn}
                  onPress={() => router.push(`/health/nutrition/search?meal=${meal}`)}
                />
              </View>
              {logs.length === 0 ? (
                <Text variant="bodySmall" style={[styles.empty, { color: colors.onSurfaceVariant }]}>Nothing logged</Text>
              ) : (
                logs.map(log => (
                  <View key={log.id} style={styles.foodRow}>
                    <View style={styles.foodInfo}>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{log.food?.name}</Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        {Math.round((log.food?.calories || 0) * log.servings)} cal · {log.servings} serving
                      </Text>
                    </View>
                    <IconButton icon="close" size={16} onPress={() => deleteLog(log.id)} />
                  </View>
                ))
              )}
            </MotionCard>
          );
        })}
      </ScrollView>

      <FAB icon="plus" style={[styles.fab, { backgroundColor: moduleColors.nutrition }]} color="#fff"
        onPress={() => router.push('/health/nutrition/search')} />

      <Portal>
        <Dialog visible={saveDialog} onDismiss={() => setSaveDialog(false)}>
          <Dialog.Title>Save as Meal</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginBottom: spacing.sm }}>
              Save today's foods as a reusable meal you can log in one tap.
            </Text>
            <TextInput label="Meal name" value={mealName} onChangeText={setMealName} mode="outlined" autoFocus placeholder="e.g. My usual breakfast" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSaveDialog(false)}>Cancel</Button>
            <Button onPress={handleSaveMeal} disabled={!mealName.trim()}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
    </SafeAreaView>
  );
}

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const { colors } = useAppTheme();
  const pct = Math.min(current / target, 1);
  return (
    <View style={styles.macroBar}>
      <View style={styles.macroLabelRow}>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{Math.round(current)}/{target}g</Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: withAlpha(color, 0.18) }]}>
        <View style={[styles.macroFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  hero: { marginBottom: spacing.sm },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  macroColumn: { flex: 1, gap: spacing.xs },
  remainingRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  remaining: { fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  actionBtn: { flex: 1 },
  mealCard: { marginBottom: spacing.sm },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mealTitle: { flex: 1, fontWeight: '700' },
  addBtn: { margin: 0, marginLeft: spacing.xs },
  empty: { fontStyle: 'italic', marginTop: spacing.xs },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, marginTop: 4 },
  foodInfo: { flex: 1 },
  macroBar: {},
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  macroTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 3 },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: shape.pill },
});
