import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, FAB, IconButton, Portal, Dialog, TextInput, Button, Snackbar, SegmentedButtons, Chip } from 'react-native-paper';
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
import type { FoodLog, MealType } from '@/types';
import { localDate } from '@/utils/dates';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function isoDate(d: Date): string {
  return localDate(d);
}

/** The last 7 days, oldest first, ending today. */
function lastSevenDays(): { iso: string; dayNum: number; letter: string }[] {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ iso: isoDate(d), dayNum: d.getDate(), letter: WEEKDAY_LETTERS[d.getDay()] });
  }
  return out;
}

function dateLabel(iso: string): string {
  if (iso === isoDate(new Date())) return 'TODAY';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}
const MEAL_ICONS: Record<MealType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  breakfast: 'weather-sunny',
  lunch: 'white-balance-sunny',
  dinner: 'weather-night',
  snack: 'cookie',
};

export function NutritionScreen({ asTab = false }: { asTab?: boolean }) {
  const { colors } = useAppTheme();
  const {
    currentDate, todayLogs, todayCalories, todayProtein, todayCarbs, todayFat,
    todayFiber, todaySugar, todaySodium,
    loadTodayLogs, deleteLog, updateLog, copyYesterday, saveMealFromDay,
  } = useNutritionStore();
  const { profile, loadProfile } = useUserStore();
  const [saveDialog, setSaveDialog] = useState(false);
  const [mealName, setMealName] = useState('');
  const [snack, setSnack] = useState('');
  const [editLog, setEditLog] = useState<FoodLog | null>(null);
  const [editServings, setEditServings] = useState('1');
  const [editMeal, setEditMeal] = useState<MealType>('lunch');

  useFocusEffect(
    useCallback(() => {
      loadTodayLogs();
      loadProfile();
    }, [])
  );

  const calorieTarget = profile?.calorieTarget || 2000;
  const proteinTarget = profile?.proteinTarget || 150;
  const proteinRange = { min: profile?.proteinTargetMin ?? null, max: profile?.proteinTargetMax ?? null };
  const carbsTarget = profile?.carbsTarget || 250;
  const carbsRange = { min: profile?.carbsTargetMin ?? null, max: profile?.carbsTargetMax ?? null };
  const fatTarget = profile?.fatTarget || 65;
  const fatRange = { min: profile?.fatTargetMin ?? null, max: profile?.fatTargetMax ?? null };
  const fiberTarget = profile?.fiberTarget || 30;
  const fiberRange = { min: profile?.fiberTargetMin ?? null, max: profile?.fiberTargetMax ?? null };
  const sugarTarget = profile?.sugarTarget || 50;
  const sugarRange = { min: profile?.sugarTargetMin ?? null, max: profile?.sugarTargetMax ?? null };
  const sodiumTarget = profile?.sodiumTarget || 2300;
  const diff = calorieTarget - todayCalories;
  const over = diff < 0;

  const getMealLogs = (meal: MealType) => todayLogs.filter(l => l.mealType === meal);

  const handleCopyYesterday = async () => {
    const count = await copyYesterday();
    setSnack(count > 0 ? `Copied ${count} item${count > 1 ? 's' : ''} from yesterday` : 'Nothing logged yesterday');
  };

  const openEdit = (log: FoodLog) => {
    setEditLog(log);
    setEditServings(String(log.servings));
    setEditMeal(log.mealType);
  };

  const handleSaveEdit = async () => {
    if (!editLog) return;
    const servings = parseFloat(editServings);
    if (!servings || servings <= 0) return;
    await updateLog(editLog.id, servings, editMeal);
    setEditLog(null);
    setSnack('Updated');
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
      <ScreenHeader title="Nutrition" showBack={!asTab} />

      <View style={styles.dayStrip}>
        {lastSevenDays().map(day => {
          const selected = day.iso === currentDate;
          return (
            <Pressable
              key={day.iso}
              onPress={() => loadTodayLogs(day.iso)}
              style={[styles.dayPill, {
                backgroundColor: selected ? withAlpha(moduleColors.nutrition, 0.2) : 'transparent',
                borderColor: selected ? moduleColors.nutrition : colors.outline,
              }]}
            >
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{day.letter}</Text>
              <Text variant="titleSmall" style={{ color: selected ? moduleColors.nutrition : colors.onSurface, fontWeight: '700' }}>
                {day.dayNum}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="labelSmall" style={[styles.dateKicker, { color: colors.onSurfaceVariant }]}>
          {dateLabel(currentDate)}
        </Text>
        <MotionCard style={styles.hero} noEnter onPress={() => router.push('/health/micronutrients')}>
          <View style={styles.heroTop}>
            <View style={styles.sideCol}>
              <MacroBar label="Fiber" current={todayFiber} target={fiberTarget} range={fiberRange} />
            </View>
            <ProgressRing
              progress={todayCalories / calorieTarget}
              size={112}
              strokeWidth={11}
              color={moduleColors.nutrition}
              value={String(todayCalories)}
              label="eaten"
            />
            <View style={styles.sideCol}>
              <MacroBar label="Sugar" current={todaySugar} target={sugarTarget} range={sugarRange} />
            </View>
          </View>
          <MacroBar label="Protein" current={todayProtein} target={proteinTarget} range={proteinRange} />
          <MacroBar label="Carbs" current={todayCarbs} target={carbsTarget} range={carbsRange} />
          <MacroBar label="Fat" current={todayFat} target={fatTarget} range={fatRange} />
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
                  onPress={() => router.push(`/health/nutrition/search?meal=${meal}&date=${currentDate}`)}
                />
              </View>
              {logs.length === 0 ? (
                <Text variant="bodySmall" style={[styles.empty, { color: colors.onSurfaceVariant }]}>Nothing logged</Text>
              ) : (
                logs.map(log => (
                  <Pressable key={log.id} style={styles.foodRow} onPress={() => openEdit(log)}>
                    <View style={styles.foodInfo}>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{log.food?.name}</Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                        {Math.round((log.food?.calories || 0) * log.servings)} cal · {log.servings} serving{log.servings !== 1 ? 's' : ''} · tap to edit
                      </Text>
                    </View>
                    <IconButton icon="close" size={16} onPress={() => deleteLog(log.id)} />
                  </Pressable>
                ))
              )}
            </MotionCard>
          );
        })}
      </ScrollView>

      <FAB icon="plus" style={[styles.fab, { backgroundColor: moduleColors.nutrition }]} color="#fff"
        onPress={() => router.push(`/health/nutrition/search?date=${currentDate}`)} />

      <Portal>
        <Dialog visible={!!editLog} onDismiss={() => setEditLog(null)}>
          <Dialog.Title>{editLog?.food?.name}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: spacing.sm }}>
              1 serving = {editLog?.food?.servingSize}{editLog?.food?.servingUnit} · {Math.round(editLog?.food?.calories || 0)} cal
            </Text>
            <TextInput label="Servings" value={editServings} onChangeText={setEditServings}
              mode="outlined" keyboardType="numeric" style={{ marginBottom: spacing.sm }} />
            <View style={styles.quickRow}>
              {[0.5, 1, 1.5, 2, 3].map(q => (
                <Chip key={q} compact onPress={() => setEditServings(String(q))}
                  selected={parseFloat(editServings) === q} showSelectedOverlay>
                  {q}
                </Chip>
              ))}
            </View>
            <Text variant="labelLarge" style={{ marginBottom: spacing.xs }}>Meal</Text>
            <SegmentedButtons
              value={editMeal}
              onValueChange={v => setEditMeal(v as MealType)}
              buttons={MEAL_ORDER.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
            />
            <Text variant="titleSmall" style={{ marginTop: spacing.sm, color: moduleColors.nutrition }}>
              = {Math.round((editLog?.food?.calories || 0) * (parseFloat(editServings) || 0))} cal ·
              P{Math.round((editLog?.food?.protein || 0) * (parseFloat(editServings) || 0))} C{Math.round((editLog?.food?.carbs || 0) * (parseFloat(editServings) || 0))} F{Math.round((editLog?.food?.fat || 0) * (parseFloat(editServings) || 0))}
            </Text>
            {(editLog?.food?.fiber != null || editLog?.food?.sugar != null || editLog?.food?.sodium != null) && (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {editLog?.food?.fiber != null ? `Fiber ${Math.round(editLog.food.fiber * (parseFloat(editServings) || 0) * 10) / 10}g · ` : ''}
                {editLog?.food?.sugar != null ? `Sugar ${Math.round(editLog.food.sugar * (parseFloat(editServings) || 0) * 10) / 10}g · ` : ''}
                {editLog?.food?.sodium != null ? `Sodium ${Math.round(editLog.food.sodium * (parseFloat(editServings) || 0))}mg` : ''}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditLog(null)}>Cancel</Button>
            <Button onPress={handleSaveEdit} disabled={!(parseFloat(editServings) > 0)}>Save</Button>
          </Dialog.Actions>
        </Dialog>

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

function MacroBar({
  label, current, target, range, unit = 'g',
}: {
  label: string;
  current: number;
  target: number;
  range: { min: number | null; max: number | null };
  unit?: string;
}) {
  const { colors } = useAppTheme();
  const hasRange = range.min !== null && range.max !== null && range.max >= range.min;
  const scale = Math.max(target, range.max ?? 0, current, 1);
  const pct = Math.min(current / scale, 1);
  const bandStart = hasRange ? Math.min((range.min! / scale) * 100, 100) : 0;
  const bandWidth = hasRange ? Math.min(((range.max! - range.min!) / scale) * 100, 100 - bandStart) : 0;
  const status = hasRange
    ? current < range.min! ? '#FF6B6B' : current > range.max! ? '#FFA726' : '#66BB6A'
    : current > target ? '#FFA726' : '#66BB6A';
  return (
    <View style={styles.macroBar}>
      <View style={styles.macroLabelRow}>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
          {Math.round(current)}/{hasRange ? `${range.min}-${range.max}` : target}{unit}
        </Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.surfaceVariant }]}> 
        {hasRange && <View style={[styles.macroBand, { left: `${bandStart}%`, width: `${bandWidth}%`, backgroundColor: withAlpha('#66BB6A', 0.28) }]} />}
        <View style={[styles.macroFill, { width: `${pct * 100}%`, backgroundColor: status }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  dayStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.xs, gap: spacing.xs },
  dayPill: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: shape.pill, borderWidth: 1.5 },
  dateKicker: { letterSpacing: 1.5, fontWeight: '700', marginBottom: spacing.xs },
  hero: { marginBottom: spacing.sm, padding: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  sideCol: { flex: 1 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  microRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  microItem: { flex: 1 },
  quickRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
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
  macroBar: { marginBottom: spacing.sm },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  macroTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  macroBand: { position: 'absolute', top: 0, bottom: 0, borderRadius: 4 },
  macroFill: { height: '100%', borderRadius: 3 },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: shape.pill },
});

/** Route wrapper — pushed from Home/deep links, so it keeps the back button. */
export default function NutritionRoute() {
  return <NutritionScreen />;
}
