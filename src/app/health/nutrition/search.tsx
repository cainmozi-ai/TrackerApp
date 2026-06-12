import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Searchbar, Text, Chip, Button, SegmentedButtons, ActivityIndicator, Portal, Dialog, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, moduleColors, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import { searchOpenFoodFacts } from '@/services/openFoodFacts';
import type { Food, MealType, SavedMeal } from '@/types';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const QUICK_SERVINGS = [0.5, 1, 1.5, 2, 3];

export default function FoodSearchScreen() {
  const { colors } = useAppTheme();
  const { meal, date } = useLocalSearchParams<{ meal?: string; date?: string }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    MEALS.includes(meal as MealType) ? (meal as MealType) : 'lunch'
  );
  const [tab, setTab] = useState<'recent' | 'favorites' | 'saved'>('recent');
  // Portion dialog state
  const [pendingFood, setPendingFood] = useState<Food | null>(null);
  const [portionMode, setPortionMode] = useState<'servings' | 'amount'>('servings');
  const [amountUnit, setAmountUnit] = useState('g');
  const [servingsText, setServingsText] = useState('1');
  const [amountText, setAmountText] = useState('100');
  const [logging, setLogging] = useState(false);
  const {
    recents, favorites, savedMeals,
    loadRecents, loadFavorites, loadSavedMeals,
    logFood, addCustomFood, logSavedMeal,
  } = useNutritionStore();
  const { reward } = useUserStore();

  // Refresh on focus so foods added on the custom-food screen show up on return.
  useFocusEffect(
    useCallback(() => {
      loadRecents();
      loadFavorites();
      loadSavedMeals();
    }, [])
  );

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const local = await useNutritionStore.getState().searchFoods(query);
      const api = await searchOpenFoodFacts(query);
      setResults([...local, ...api.filter(a => !local.some(l => l.barcode === a.barcode && a.barcode))]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openPortionDialog = (food: Food) => {
    setPendingFood(food);
    setPortionMode('servings');
    setAmountUnit(food.servingUnit || 'g');
    setServingsText('1');
    setAmountText(String(food.servingSize || 100));
  };

  const portionServings = pendingFood
    ? portionMode === 'servings'
      ? parseFloat(servingsText) || 0
      : (parseFloat(amountText) || 0) / (pendingFood.servingSize || 100)
    : 0;

  const handleConfirmLog = async () => {
    if (!pendingFood || portionServings <= 0 || logging) return;
    setLogging(true);
    try {
      let foodId = pendingFood.id;
      if (!foodId || foodId === 0) foodId = await addCustomFood(pendingFood);
      await logFood(foodId, selectedMeal, Math.round(portionServings * 100) / 100, date);
      await reward(10, 'meal', 'Logged a meal', 'first_meal');
      setPendingFood(null);
      router.back();
    } finally {
      setLogging(false);
    }
  };

  const handleLogSaved = async (meal: SavedMeal) => {
    await logSavedMeal(meal.id, selectedMeal, date);
    await reward(10, 'meal', 'Logged a saved meal', 'first_meal');
    router.back();
  };

  const searching = query.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Add Food" />

      <Searchbar
        placeholder="Search foods..."
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
        style={[styles.searchbar, { backgroundColor: colors.surface }]}
        loading={loading}
      />

      <View style={styles.mealChips}>
        {MEALS.map(meal => (
          <Chip
            key={meal}
            selected={selectedMeal === meal}
            onPress={() => setSelectedMeal(meal)}
            style={styles.chip}
            selectedColor={moduleColors.nutrition}
            showSelectedOverlay
          >
            {meal.charAt(0).toUpperCase() + meal.slice(1)}
          </Chip>
        ))}
      </View>

      <View style={styles.methodRow}>
        <Button mode="contained-tonal" icon="barcode-scan" compact style={styles.methodBtn}
          onPress={() => router.push(`/health/nutrition/scan?meal=${selectedMeal}${date ? `&date=${date}` : ''}`)}>
          Scan
        </Button>
        <Button mode="contained-tonal" icon="camera-iris" compact style={styles.methodBtn} onPress={() => router.push('/health/nutrition/ai-photo')}>
          AI Photo
        </Button>
        <Button mode="contained-tonal" icon="plus" compact style={styles.methodBtn} onPress={() => router.push(`/health/nutrition/add-custom?meal=${selectedMeal}${date ? `&date=${date}` : ''}`)}>
          Custom
        </Button>
      </View>

      {!searching && (
        <SegmentedButtons
          value={tab}
          onValueChange={v => setTab(v as typeof tab)}
          buttons={[
            { value: 'recent', label: 'Recent', icon: 'history' },
            { value: 'favorites', label: 'Favorites', icon: 'star' },
            { value: 'saved', label: 'Meals', icon: 'silverware-fork-knife' },
          ]}
          style={styles.tabs}
        />
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {searching ? (
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : results.length === 0 ? (
            <EmptyState icon="food-off" color={moduleColors.nutrition} title="No matches"
              body="Try another search, or add it as a custom food." />
          ) : (
            results.map((food, i) => (
              <FoodRow key={`${food.barcode || food.name}-${i}`} food={food} onAdd={() => openPortionDialog(food)} />
            ))
          )
        ) : tab === 'recent' ? (
          recents.length === 0 ? (
            <EmptyState icon="history" color={moduleColors.nutrition} title="No recent foods yet"
              body="Foods you log will show up here for one-tap re-logging." />
          ) : (
            recents.map(food => <FoodRow key={food.id} food={food} onAdd={() => openPortionDialog(food)} />)
          )
        ) : tab === 'favorites' ? (
          favorites.length === 0 ? (
            <EmptyState icon="star-outline" color={moduleColors.nutrition} title="No favorites yet"
              body="Star foods you eat often to log them in a tap." />
          ) : (
            favorites.map(food => <FoodRow key={food.id} food={food} onAdd={() => openPortionDialog(food)} />)
          )
        ) : savedMeals.length === 0 ? (
          <EmptyState icon="silverware-fork-knife" color={moduleColors.nutrition} title="No saved meals"
            body="On your daily log, tap 'Save as meal' to store a whole day's foods as a combo." />
        ) : (
          savedMeals.map(meal => (
            <Pressable key={meal.id} onPress={() => handleLogSaved(meal)} style={[styles.row, { backgroundColor: colors.surface }]}>
              <View style={[styles.iconChip, { backgroundColor: withAlpha(moduleColors.nutrition, 0.16) }]}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={moduleColors.nutrition} />
              </View>
              <View style={styles.rowInfo}>
                <Text variant="titleSmall" style={{ color: colors.onSurface }}>{meal.name}</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{meal.totalCalories} cal</Text>
              </View>
              <MaterialCommunityIcons name="plus-circle" size={24} color={moduleColors.nutrition} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={!!pendingFood} onDismiss={() => setPendingFood(null)}>
          <Dialog.Title>{pendingFood?.name}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginBottom: spacing.sm }}>
              1 serving = {pendingFood?.servingSize}{pendingFood?.servingUnit} · {Math.round(pendingFood?.calories || 0)} cal
            </Text>
            <SegmentedButtons
              value={portionMode === 'servings' ? 'servings' : amountUnit}
              onValueChange={v => {
                if (v === 'servings') setPortionMode('servings');
                else { setPortionMode('amount'); setAmountUnit(v); }
              }}
              buttons={[
                { value: 'servings', label: 'Servings' },
                // Liquids and solids share the same per-100 basis, so g and ml
                // are both offered when the food is weight-based.
                ...(pendingFood?.servingUnit === 'g'
                  ? [{ value: 'g', label: 'g' }, { value: 'ml', label: 'ml' }]
                  : [{ value: pendingFood?.servingUnit || 'g', label: pendingFood?.servingUnit || 'g' }]),
              ]}
              style={{ marginBottom: spacing.sm }}
            />
            {portionMode === 'servings' ? (
              <>
                <TextInput label="Number of servings" value={servingsText} onChangeText={setServingsText}
                  mode="outlined" keyboardType="numeric" autoFocus />
                <View style={styles.quickRow}>
                  {QUICK_SERVINGS.map(q => (
                    <Chip key={q} compact onPress={() => setServingsText(String(q))}
                      selected={parseFloat(servingsText) === q} showSelectedOverlay>
                      {q}
                    </Chip>
                  ))}
                </View>
              </>
            ) : (
              <TextInput label={`Amount (${amountUnit})`} value={amountText} onChangeText={setAmountText}
                mode="outlined" keyboardType="numeric" autoFocus />
            )}
            <Text variant="titleSmall" style={{ marginTop: spacing.sm, color: moduleColors.nutrition }}>
              = {Math.round((pendingFood?.calories || 0) * portionServings)} cal ·
              P{Math.round((pendingFood?.protein || 0) * portionServings)} C{Math.round((pendingFood?.carbs || 0) * portionServings)} F{Math.round((pendingFood?.fat || 0) * portionServings)}
            </Text>
            {(pendingFood?.fiber != null || pendingFood?.sugar != null || pendingFood?.sodium != null) && (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {pendingFood?.fiber != null ? `Fiber ${Math.round(pendingFood.fiber * portionServings * 10) / 10}g · ` : ''}
                {pendingFood?.sugar != null ? `Sugar ${Math.round(pendingFood.sugar * portionServings * 10) / 10}g · ` : ''}
                {pendingFood?.sodium != null ? `Sodium ${Math.round(pendingFood.sodium * portionServings)}mg` : ''}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPendingFood(null)}>Cancel</Button>
            <Button onPress={handleConfirmLog} disabled={portionServings <= 0 || logging} loading={logging}>
              Log to {selectedMeal}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

function FoodRow({ food, onAdd }: { food: Food; onAdd: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={onAdd} style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={styles.rowInfo}>
        <Text variant="titleSmall" style={{ color: colors.onSurface }} numberOfLines={1}>{food.name}</Text>
        {!!food.brand && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }} numberOfLines={1}>{food.brand}</Text>}
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {Math.round(food.calories)} cal · P{Math.round(food.protein)} C{Math.round(food.carbs)} F{Math.round(food.fat)} · per {food.servingSize}{food.servingUnit}
        </Text>
      </View>
      <MaterialCommunityIcons name="plus-circle" size={24} color={moduleColors.nutrition} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchbar: { marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: shape.md },
  mealChips: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  chip: {},
  methodRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  methodBtn: { flex: 1 },
  tabs: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  scrollContent: { padding: spacing.md, paddingTop: 0, paddingBottom: 40 },
  loader: { marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: shape.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconChip: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowInfo: { flex: 1 },
  quickRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
});
