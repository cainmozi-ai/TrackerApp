import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, Portal, Dialog, TextInput, Button, Snackbar, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { WeekStrip } from '@/components/common/WeekStrip';
import { MotionCard } from '@/components/common/MotionCard';
import { Pill } from '@/components/common/Pill';
import { CalorieCard } from '@/components/nutrition/CalorieCard';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import type { FoodLog, MealType } from '@/types';
import { localDate } from '@/utils/dates';
import { macroLine, servingsLabel } from '@/utils/foodFormat';

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
export function NutritionScreen({ asTab = false }: { asTab?: boolean }) {
  const { colors } = useAppTheme();
  const {
    currentDate, todayLogs, todayCalories, todayProtein, todayCarbs, todayFat,
    todayFiber, todaySugar, todaySodium,
    loadTodayLogs, deleteLog, updateLog, logFood, copyYesterday, saveMealFromDay,
  } = useNutritionStore();
  const { profile, loadProfile } = useUserStore();
  const [saveDialog, setSaveDialog] = useState(false);
  const [mealName, setMealName] = useState('');
  const [snack, setSnack] = useState('');
  const [editLog, setEditLog] = useState<FoodLog | null>(null);
  const [editServings, setEditServings] = useState('1');
  const [editMeal, setEditMeal] = useState<MealType>('lunch');
  // Kept for a few seconds after a delete so it can be undone.
  const [removed, setRemoved] = useState<FoodLog | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadTodayLogs();
      loadProfile();
    }, [])
  );

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

  const handleDeleteLog = async () => {
    if (!editLog) return;
    const log = editLog;
    setEditLog(null);
    await deleteLog(log.id);
    setRemoved(log);
  };

  const handleUndoDelete = async () => {
    if (!removed) return;
    const log = removed;
    setRemoved(null);
    await logFood(log.foodId, log.mealType, log.servings, log.logDate);
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

      <WeekStrip selected={currentDate} onSelect={iso => loadTodayLogs(iso)} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentDate !== localDate(new Date()) && (
          <Text variant="labelSmall" style={[styles.dateKicker, { color: colors.onSurfaceVariant }]}>
            {dateLabel(currentDate)}
          </Text>
        )}
        <View style={styles.hero}>
          <CalorieCard
            profile={profile}
            totals={{ calories: todayCalories, protein: todayProtein, carbs: todayCarbs, fat: todayFat, fiber: todayFiber, sugar: todaySugar, sodium: todaySodium }}
            onPress={() => router.push('/health/micronutrients')}
          />
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={handleCopyYesterday} accessibilityRole="button"
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
            <Text variant="bodyMedium" style={{ color: colors.onSurface }}>Copy Yesterday</Text>
          </Pressable>
          <Pressable onPress={() => setSaveDialog(true)} disabled={todayLogs.length === 0} accessibilityRole="button"
            accessibilityState={{ disabled: todayLogs.length === 0 }}
            style={[styles.actionBtn, { backgroundColor: colors.surface, opacity: todayLogs.length === 0 ? 0.4 : 1 }]}>
            <Text variant="bodyMedium" style={{ color: colors.onSurface }}>Save as Meal</Text>
          </Pressable>
        </View>

        {MEAL_ORDER.map((meal, i) => {
          const logs = getMealLogs(meal);
          const cals = logs.reduce((s, l) => s + (l.food?.calories || 0) * l.servings, 0);
          return (
            <MotionCard key={meal} index={i} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={[styles.mealDot, { backgroundColor: accent }]} />
                <Text variant="titleSmall" style={[styles.mealTitle, { color: colors.onSurface }]}>
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.onSurface }}>{Math.round(cals)} cal</Text>
                <Pressable
                  onPress={() => router.push(`/health/nutrition/search?meal=${meal}&date=${currentDate}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add food to ${meal}`}
                  style={[styles.addBtn, { backgroundColor: colors.surfaceVariant }]}
                >
                  <MaterialCommunityIcons name="plus" size={18} color={colors.onSurface} />
                </Pressable>
              </View>
              {logs.length === 0 ? (
                <Text variant="bodySmall" style={[styles.empty, { color: colors.onSurfaceVariant }]}>Nothing logged</Text>
              ) : (
                logs.map(log => (
                  <Pressable key={log.id} style={styles.foodRow} onPress={() => openEdit(log)}
                    accessibilityRole="button" accessibilityHint="Edit or delete this food">
                    <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{log.food?.name}</Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurface }}>
                      {Math.round((log.food?.calories || 0) * log.servings)} cal
                      {log.food ? ` · ${macroLine(log.food, log.servings)}` : ''} · {servingsLabel(log.servings)}
                    </Text>
                  </Pressable>
                ))
              )}
            </MotionCard>
          );
        })}
      </ScrollView>


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
                <Pill key={q} label={String(q)} compact onPress={() => setEditServings(String(q))}
                  selected={parseFloat(editServings) === q} />
              ))}
            </View>
            <Text variant="labelLarge" style={{ marginBottom: spacing.xs }}>Meal</Text>
            <SegmentedButtons
              value={editMeal}
              onValueChange={v => setEditMeal(v as MealType)}
              buttons={MEAL_ORDER.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
            />
            <Text variant="titleSmall" style={{ marginTop: spacing.sm, color: colors.accentText }}>
              = {Math.round((editLog?.food?.calories || 0) * (parseFloat(editServings) || 0))} cal
              {editLog?.food ? ` · ${macroLine(editLog.food, parseFloat(editServings) || 0)}` : ''}
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
            <Button textColor={colors.error} onPress={handleDeleteLog} style={styles.deleteBtn}>Delete</Button>
            <Button textColor={colors.onSurface} onPress={() => setEditLog(null)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveEdit} disabled={!(parseFloat(editServings) > 0)}>Save</Button>
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
            <Button textColor={colors.onSurface} onPress={() => setSaveDialog(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveMeal} disabled={!mealName.trim()}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2500}>{snack}</Snackbar>
      <Snackbar visible={!!removed} onDismiss={() => setRemoved(null)} duration={6000}
        action={{ label: 'Undo', onPress: handleUndoDelete }}>
        {`Removed ${removed?.food?.name ?? 'food'}`}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  dateKicker: { fontWeight: '300', marginBottom: spacing.xs },
  hero: { marginBottom: spacing.sm },
  quickRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  actionBtn: { flex: 1, height: 40, borderRadius: shape.md, justifyContent: 'center', alignItems: 'center' },
  mealCard: { marginBottom: spacing.sm },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mealDot: { width: 16, height: 16, borderRadius: 8 },
  mealTitle: { flex: 1, fontWeight: '300' },
  addBtn: { width: 28, height: 28, borderRadius: shape.sm, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.xs },
  empty: { marginTop: spacing.sm },
  foodRow: { paddingVertical: 4, marginTop: 4, gap: 2 },
  deleteBtn: { marginRight: 'auto' },
});

/** Route wrapper — pushed from Home/deep links, so it keeps the back button. */
export default function NutritionRoute() {
  return <NutritionScreen />;
}
