import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface, Button, Portal, Dialog, Searchbar, TouchableRipple, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useMealPlanStore, getWeekStart } from '@/stores/mealPlanStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { Food, MealType } from '@/types';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function MealPlannerScreen() {
  const { plans, loadWeek, addToPlan, removeFromPlan, generateShoppingList } = useMealPlanStore();
  const { searchFoods } = useNutritionStore();
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [pickerSlot, setPickerSlot] = useState<{ date: string; meal: MealType } | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Food[]>([]);

  useEffect(() => {
    loadWeek(weekStart);
  }, [weekStart]);

  useEffect(() => {
    if (pickerSlot) {
      searchFoods(search).then(setResults);
    }
  }, [search, pickerSlot]);

  const slotPlans = (date: string, meal: MealType) =>
    plans.filter(p => p.planDate === date && p.mealType === meal);

  const handleAdd = async (food: Food) => {
    if (!pickerSlot) return;
    await addToPlan(food.id, pickerSlot.meal, pickerSlot.date, 1);
    setPickerSlot(null);
    setSearch('');
  };

  const handleGenerate = async () => {
    await generateShoppingList(weekStart);
    router.push('/health/meal-planner/shopping-list');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Meal Planner"
        right={<IconButton icon="cart" onPress={() => router.push('/health/meal-planner/shopping-list')} />}
      />

      <View style={styles.weekNav}>
        <IconButton icon="chevron-left" onPress={() => setWeekStart(addDays(weekStart, -7))} />
        <Text variant="titleSmall">Week of {weekStart}</Text>
        <IconButton icon="chevron-right" onPress={() => setWeekStart(addDays(weekStart, 7))} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {DAY_NAMES.map((dayName, i) => {
          const date = addDays(weekStart, i);
          return (
            <Surface key={date} style={styles.dayCard} elevation={1}>
              <Text variant="titleSmall" style={styles.dayTitle}>{dayName} · {date.slice(5)}</Text>
              {MEALS.map(meal => {
                const items = slotPlans(date, meal);
                return (
                  <View key={meal} style={styles.mealRow}>
                    <Text variant="labelMedium" style={styles.mealLabel}>
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </Text>
                    <View style={styles.mealItems}>
                      {items.map(item => (
                        <Chip
                          key={item.id}
                          onClose={() => removeFromPlan(item.id)}
                          style={styles.foodChip}
                          compact
                        >
                          {item.foodName}
                        </Chip>
                      ))}
                      <IconButton
                        icon="plus"
                        size={18}
                        mode="contained-tonal"
                        onPress={() => { setPickerSlot({ date, meal }); setSearch(''); }}
                        style={styles.addBtn}
                      />
                    </View>
                  </View>
                );
              })}
            </Surface>
          );
        })}

        <Button mode="contained" icon="cart-plus" style={styles.generateBtn} onPress={handleGenerate}>
          Generate Shopping List
        </Button>
      </ScrollView>

      <Portal>
        <Dialog visible={!!pickerSlot} onDismiss={() => setPickerSlot(null)} style={styles.pickerDialog}>
          <Dialog.Title>Add Food</Dialog.Title>
          <Dialog.Content>
            <Searchbar placeholder="Search your foods..." value={search} onChangeText={setSearch} style={styles.pickerSearch} />
            <ScrollView style={styles.pickerList}>
              {results.length === 0 ? (
                <Text variant="bodySmall" style={styles.emptyText}>
                  No foods yet. Add foods via Nutrition first.
                </Text>
              ) : (
                results.map(food => (
                  <TouchableRipple key={food.id} onPress={() => handleAdd(food)} style={styles.pickerItem}>
                    <View>
                      <Text variant="bodyLarge">{food.name}</Text>
                      <Text variant="bodySmall" style={styles.foodMeta}>{food.calories} cal</Text>
                    </View>
                  </TouchableRipple>
                ))
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickerSlot(null)}>Done</Button>
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
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  dayCard: { padding: spacing.md, borderRadius: 16, marginBottom: spacing.sm, backgroundColor: theme.colors.surface },
  dayTitle: { fontWeight: '700', color: moduleColors.nutrition, marginBottom: spacing.xs },
  mealRow: { marginTop: spacing.xs },
  mealLabel: { color: theme.colors.onSurfaceVariant },
  mealItems: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  foodChip: { backgroundColor: theme.colors.surfaceVariant },
  addBtn: { margin: 0 },
  generateBtn: { marginTop: spacing.md },
  pickerDialog: { maxHeight: '80%' },
  pickerSearch: { marginBottom: spacing.sm, backgroundColor: theme.colors.surfaceVariant },
  pickerList: { maxHeight: 320 },
  pickerItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  foodMeta: { color: theme.colors.onSurfaceVariant },
  emptyText: { color: theme.colors.onSurfaceVariant, textAlign: 'center', padding: spacing.md },
});
