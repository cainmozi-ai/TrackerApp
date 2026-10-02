import { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Searchbar, Text, Button, SegmentedButtons, ActivityIndicator, Portal, Dialog, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, moduleColors, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Pill } from '@/components/common/Pill';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import {
  searchAllSources, SOURCE_META, ONLINE_SOURCES,
  type OnlineSourceId, type SourceStatus,
} from '@/services/foodSources';
import { macroLine, extrasLine } from '@/utils/foodFormat';
import { useMicroEstimate, MicroEstimateNote } from '@/components/nutrition/MicroEstimate';
import { FoodMicroChips, FoodMicroList } from '@/components/nutrition/FoodMicros';
import type { Food, MealType, SavedMeal } from '@/types';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const QUICK_SERVINGS = [0.5, 1, 1.5, 2, 3];

const mealLabel = (m: MealType) => m.charAt(0).toUpperCase() + m.slice(1);

/** Best guess at which meal you're logging, from the time of day. */
function mealForNow(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

export default function FoodSearchScreen() {
  const { colors } = useAppTheme();
  const { meal, date } = useLocalSearchParams<{ meal?: string; date?: string }>();
  const [query, setQuery] = useState('');
  // Your own library is searched as you type; the online databases only on
  // demand (Enter or the "Search online" row) — their APIs are rate-limited.
  const [localResults, setLocalResults] = useState<Food[]>([]);
  const [localPending, setLocalPending] = useState(false);
  const [onlineResults, setOnlineResults] = useState<Food[] | null>(null);
  const [sourceStatus, setSourceStatus] = useState<Record<OnlineSourceId, SourceStatus> | null>(null);
  const [loading, setLoading] = useState(false);
  const latestQuery = useRef('');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    MEALS.includes(meal as MealType) ? (meal as MealType) : mealForNow()
  );
  const [tab, setTab] = useState<'all' | 'recent' | 'saved' | 'custom'>('all');
  // Portion dialog state
  const [pendingFood, setPendingFood] = useState<Food | null>(null);
  const [portionMode, setPortionMode] = useState<'servings' | 'amount'>('servings');
  const [amountUnit, setAmountUnit] = useState('g');
  const [servingsText, setServingsText] = useState('1');
  const [amountText, setAmountText] = useState('100');
  const [logging, setLogging] = useState(false);
  // Labels often list no vitamins/minerals — estimate them from a similar food.
  const estimate = useMicroEstimate(pendingFood);
  const {
    allFoods, recents, savedMeals,
    loadAllFoods, loadRecents, loadSavedMeals,
    logFood, addCustomFood, logSavedMeal, applyMicroEstimate, setNoEstimate,
  } = useNutritionStore();
  const { reward, loadProfile } = useUserStore();

  // Refresh on focus so foods added on the custom-food screen show up on return.
  useFocusEffect(
    useCallback(() => {
      loadAllFoods();
      loadRecents();
      loadSavedMeals();
      loadProfile(); // vitamin/mineral % on the food cards use the profile's targets
    }, [])
  );

  // Live local search, lightly debounced.
  useEffect(() => {
    const q = query.trim();
    latestQuery.current = q;
    setOnlineResults(null);
    setSourceStatus(null);
    setLoading(false);
    if (!q) { setLocalResults([]); setLocalPending(false); return; }
    setLocalPending(true);
    const t = setTimeout(async () => {
      const local = await useNutritionStore.getState().searchFoods(q);
      if (latestQuery.current === q) { setLocalResults(local); setLocalPending(false); }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  const handleSearchOnline = async () => {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    try {
      // Results stream in as each database answers.
      await searchAllSources(q, (results, status) => {
        if (latestQuery.current !== q) return;
        setOnlineResults(results.filter(a => !localResults.some(l =>
          (a.barcode && l.barcode === a.barcode) || (a.sourceId && l.source === a.source && l.sourceId === a.sourceId))));
        setSourceStatus(status);
      });
    } catch {
      if (latestQuery.current === q) setOnlineResults([]);
    } finally {
      if (latestQuery.current === q) setLoading(false);
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
      const est = estimate.status === 'found' && estimate.include ? estimate.estimate : null;
      // Switched off: remember it, so this food is never estimated again.
      const declined = estimate.status === 'found' && !estimate.include;
      if (!foodId || foodId === 0) {
        foodId = await addCustomFood(declined ? { ...pendingFood, noEstimate: true } : estimate.apply(pendingFood));
      } else if (est) await applyMicroEstimate(foodId, est.micros, est.from);
      else if (declined) await setNoEstimate(foodId, true);
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
      <ScreenHeader title={`Add to ${mealLabel(selectedMeal)}`} />

      <View style={styles.mealRow} accessibilityRole="radiogroup" accessibilityLabel="Meal">
        {MEALS.map(m => (
          <Pill key={m} label={mealLabel(m)} selected={selectedMeal === m} onPress={() => setSelectedMeal(m)}
            compact style={styles.mealChip} />
        ))}
      </View>

      <Searchbar
        placeholder="Search foods..."
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearchOnline}
        returnKeyType="search"
        style={[styles.searchbar, { backgroundColor: colors.surface }]}
      />

      <View style={styles.tabRow}>
        {([
          ['all', 'All'], ['recent', 'Recent'], ['saved', 'My Meals'], ['custom', 'Custom'],
        ] as const).map(([value, label]) => (
          <Pill key={value} label={label} selected={tab === value} onPress={() => setTab(value)} />
        ))}
      </View>

      <View style={styles.methodRow}>
        <Button mode="contained-tonal" icon="barcode-scan" compact style={styles.methodBtn}
          onPress={() => router.push(`/health/nutrition/scan?meal=${selectedMeal}${date ? `&date=${date}` : ''}`)}>
          Scan Barcode
        </Button>
        <Button mode="contained-tonal" icon="plus" compact style={styles.methodBtn} onPress={() => router.push(`/health/nutrition/add-custom?meal=${selectedMeal}${date ? `&date=${date}` : ''}`)}>
          Create Food
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text variant="labelSmall" style={[styles.resultsLabel, { color: colors.onSurfaceVariant }]}>RESULTS</Text>
        {searching ? (
          <>
            {localResults.map(food => (
              <FoodRow key={`local-${food.id}`} food={food} onAdd={() => openPortionDialog(food)} />
            ))}
            {sourceStatus && <SourceStatusRow status={sourceStatus} />}
            {onlineResults === null || (loading && onlineResults.length === 0) ? (
              loading ? (
                <ActivityIndicator color={colors.primary} style={styles.loader} />
              ) : (
                <Pressable onPress={handleSearchOnline} accessibilityRole="button"
                  style={[styles.row, styles.onlineRow, { borderColor: colors.outline }]}>
                  <MaterialCommunityIcons name="web" size={22} color={colors.accentText} />
                  <View style={styles.rowInfo}>
                    <Text variant="titleSmall" style={{ color: colors.onSurface }}>Search online for “{query.trim()}”</Text>
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      {localPending ? 'Searching your foods…'
                        : localResults.length ? 'USDA, Canadian Nutrient File, Open Food Facts & NIH supplement labels'
                        : 'Nothing in your library matches yet. Search USDA, Open Food Facts & more'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
                </Pressable>
              )
            ) : onlineResults.length === 0 && localResults.length === 0 ? (
              <EmptyState icon="food-off" color={moduleColors.nutrition} title="No matches"
                body="Try another search, or add it as a custom food." />
            ) : (
              <>
                {onlineResults.length > 0 && (
                  <Text variant="labelSmall" style={[styles.resultsLabel, styles.onlineLabel, { color: colors.onSurfaceVariant }]}>ONLINE</Text>
                )}
                {onlineResults.map((food, i) => (
                  <FoodRow key={`${food.source}-${food.sourceId || food.name}-${i}`} food={food} onAdd={() => openPortionDialog(food)} />
                ))}
              </>
            )}
          </>
        ) : tab === 'all' ? (
          allFoods.map(food => <FoodRow key={food.id} food={food} onAdd={() => openPortionDialog(food)} />)
        ) : tab === 'recent' ? (
          recents.length === 0 ? (
            <EmptyState icon="history" color={moduleColors.nutrition} title="No recent foods yet"
              body="Foods you log will show up here for one-tap re-logging." />
          ) : (
            recents.map(food => <FoodRow key={food.id} food={food} onAdd={() => openPortionDialog(food)} />)
          )
        ) : tab === 'saved' && savedMeals.length === 0 ? (
          <EmptyState icon="silverware-fork-knife" color={moduleColors.nutrition} title="No saved meals"
            body="On your daily log, tap 'Save as meal' to store a whole day's foods as a combo." />
        ) : tab === 'saved' ? (
          savedMeals.map(meal => (
            <Pressable key={meal.id} onPress={() => handleLogSaved(meal)} style={[styles.row, { backgroundColor: colors.surface }]}>
              <View style={[styles.iconChip, { backgroundColor: withAlpha(moduleColors.nutrition, 0.16) }]}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={moduleColors.nutrition} />
              </View>
              <View style={styles.rowInfo}>
                <Text variant="titleSmall" style={{ color: colors.onSurface }}>{meal.name}</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{meal.totalCalories} cal</Text>
              </View>
              <AddSquare />
            </Pressable>
          ))
        ) : (
          allFoods.filter(food => food.isCustom).length === 0 ? (
            <EmptyState icon="food-variant" color={moduleColors.nutrition} title="No custom foods"
              body="Create a food to add it to your personal library." />
          ) : (
            allFoods.filter(food => food.isCustom).map(food => <FoodRow key={food.id} food={food} onAdd={() => openPortionDialog(food)} />)
          )
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
                    <Pill key={q} label={String(q)} compact onPress={() => setServingsText(String(q))}
                      selected={parseFloat(servingsText) === q} />
                  ))}
                </View>
              </>
            ) : (
              <TextInput label={`Amount (${amountUnit})`} value={amountText} onChangeText={setAmountText}
                mode="outlined" keyboardType="numeric" autoFocus />
            )}
            <Text variant="titleSmall" style={{ marginTop: spacing.sm, color: colors.accentText }}>
              = {Math.round((pendingFood?.calories || 0) * portionServings)} cal
              {pendingFood ? ` · ${macroLine(pendingFood, portionServings)}` : ''}
            </Text>
            {!!pendingFood && !!extrasLine(pendingFood) && (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{extrasLine(pendingFood, portionServings)}</Text>
            )}
            <MicroEstimateNote state={estimate} />
            {pendingFood && <FoodMicroList food={estimate.apply(pendingFood)} servings={portionServings} />}
            {!!pendingFood?.isCustom && pendingFood.id > 0 && (
              <Button icon="pencil" mode="text" compact textColor={colors.onSurface} style={styles.editFoodBtn}
                onPress={() => { const fid = pendingFood.id; setPendingFood(null); router.push(`/health/nutrition/add-custom?id=${fid}`); }}>
                Edit food
              </Button>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.accentText} onPress={() => setPendingFood(null)}>Cancel</Button>
            <Button mode="contained" onPress={handleConfirmLog} disabled={portionServings <= 0 || logging} loading={logging}>
              Log to {mealLabel(selectedMeal)}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

function FoodRow({ food, onAdd }: { food: Food; onAdd: () => void }) {
  const { colors } = useAppTheme();
  const badge = food.source && food.source !== 'custom' ? SOURCE_META[food.source].short : null;
  const unit = /^[a-z]{1,2}$/.test(food.servingUnit) ? food.servingUnit : ` ${food.servingUnit}`;
  return (
    <Pressable onPress={onAdd} style={[styles.row, { backgroundColor: colors.surface }]}
      // Long-press a food you've saved or scanned to edit it.
      onLongPress={food.isCustom && food.id > 0 ? () => router.push(`/health/nutrition/add-custom?id=${food.id}`) : undefined}
      accessibilityHint={food.isCustom && food.id > 0 ? 'Long-press to edit this food' : undefined}>
      <View style={styles.rowInfo}>
        <Text variant="titleSmall" style={{ color: colors.onSurface }} numberOfLines={1}>{food.name}</Text>
        {(!!food.brand || !!badge) && (
          <View style={styles.metaRow}>
            {!!badge && (
              <View style={[styles.badge, { backgroundColor: colors.surfaceVariant }]}
                accessibilityLabel={`Data from ${SOURCE_META[food.source!].label}`}>
                <Text style={[styles.badgeText, { color: colors.onSurfaceVariant }]}>{badge}</Text>
              </View>
            )}
            {!!food.brand && <Text variant="bodySmall" style={[styles.brand, { color: colors.onSurfaceVariant }]} numberOfLines={1}>{food.brand}</Text>}
          </View>
        )}
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {`${Math.round(food.calories)} cal · ${macroLine(food)} · ${food.servingSize}${unit}`}
        </Text>
        <FoodMicroChips food={food} />
      </View>
      <AddSquare />
    </Pressable>
  );
}

/** One chip per online database: still searching, how many it found, or why it failed. */
function SourceStatusRow({ status }: { status: Record<OnlineSourceId, SourceStatus> }) {
  const { colors } = useAppTheme();
  const errors = ONLINE_SOURCES.filter(s => status[s].state === 'error');
  return (
    <View style={styles.statusWrap}>
      <View style={styles.statusRow}>
        {ONLINE_SOURCES.map(s => {
          const st = status[s];
          const icon = st.state === 'loading' ? 'dots-horizontal' : st.state === 'error' ? 'alert-circle-outline' : 'check';
          const said = st.state === 'loading' ? 'searching' : st.state === 'error' ? st.message : `${st.count} results`;
          return (
            <View key={s} style={[styles.statusChip, { backgroundColor: colors.surface }]}
              accessibilityLabel={`${SOURCE_META[s].label}: ${said}`}>
              <MaterialCommunityIcons name={icon} size={14} color={st.state === 'error' ? colors.error : colors.onSurfaceVariant} />
              <Text style={[styles.badgeText, { color: colors.onSurface }]}>
                {st.state === 'done' ? `${SOURCE_META[s].short} ${st.count}` : SOURCE_META[s].short}
              </Text>
            </View>
          );
        })}
      </View>
      {errors.map(s => (
        <Text key={s} variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {`${SOURCE_META[s].short}: ${status[s].message}`}
        </Text>
      ))}
    </View>
  );
}

/** The design's add affordance: a small grey rounded square with a "+". */
function AddSquare() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.addSquare, { backgroundColor: colors.surfaceVariant }]}>
      <MaterialCommunityIcons name="plus" size={18} color={colors.onSurface} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchbar: { marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: shape.md },
  mealRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  mealChip: { flex: 1, paddingHorizontal: 0 },
  onlineRow: { borderWidth: 1, borderStyle: 'dashed', backgroundColor: 'transparent' },
  onlineLabel: { marginTop: spacing.sm, marginBottom: spacing.sm },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  methodRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  methodBtn: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingTop: 0, paddingBottom: 40 },
  resultsLabel: { fontWeight: '300', marginBottom: spacing.md },
  loader: { marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: shape.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  addSquare: { width: 30, height: 30, borderRadius: shape.sm, justifyContent: 'center', alignItems: 'center' },
  iconChip: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowInfo: { flex: 1 },
  editFoodBtn: { alignSelf: 'flex-start', marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 1 },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 11, fontWeight: '400', letterSpacing: 0.3 },
  brand: { flexShrink: 1 },
  statusWrap: { marginBottom: spacing.sm, gap: 4 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  quickRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
});
