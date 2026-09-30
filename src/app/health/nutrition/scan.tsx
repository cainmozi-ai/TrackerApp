import { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, IconButton, Surface, Button, ActivityIndicator, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { moduleColors, spacing, shape, type AppColors } from '@/theme';
import { useAppTheme, useThemedStyles } from '@/theme/ThemeContext';
import { lookupBarcodeAll, SOURCE_META } from '@/services/foodSources';
import { useMicroEstimate, MicroEstimateNote } from '@/components/nutrition/MicroEstimate';
import { FoodMicroList } from '@/components/nutrition/FoodMicros';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import type { Food, MealType } from '@/types';
import { Pill } from '@/components/common/Pill';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const QUICK_SERVINGS = [0.5, 1, 1.5, 2, 3];

/** Rescale a food to a per-100 basis so the user can pick whichever column of
 * the label they think in — some labels list per serving, some per 100g/ml. */
function per100Variant(food: Food): Food {
  const factor = 100 / (food.servingSize || 100);
  const r1 = (v: number) => Math.round(v * factor * 10) / 10;
  return {
    ...food,
    calories: Math.round(food.calories * factor),
    protein: r1(food.protein),
    carbs: r1(food.carbs),
    fat: r1(food.fat),
    fiber: food.fiber != null ? r1(food.fiber) : null,
    sugar: food.sugar != null ? r1(food.sugar) : null,
    sodium: food.sodium != null ? Math.round(food.sodium * factor) : null,
    micros: food.micros
      ? Object.fromEntries(Object.entries(food.micros).map(([k, v]) => [k, Math.round(v * factor * 1000) / 1000]))
      : food.micros,
    servingSize: 100,
    // Stored separately from the per-serving version so the two bases never mix.
    sourceId: food.sourceId ? `${food.sourceId}:100` : food.sourceId,
  };
}

export default function ScanScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { meal: mealParam, date } = useLocalSearchParams<{ meal?: string; date?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Food | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [meal, setMeal] = useState<MealType>(MEALS.includes(mealParam as MealType) ? (mealParam as MealType) : 'lunch');
  const [basis, setBasis] = useState<'serving' | 'per100'>('serving');
  const [servingsText, setServingsText] = useState('1');
  const { addCustomFood, logFood } = useNutritionStore();
  const { reward } = useUserStore();

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    setNotFound(false);
    const food = await lookupBarcodeAll(data);
    setLoading(false);
    if (food) {
      setResult(food);
      setBasis('serving');
      setServingsText('1');
    } else {
      setNotFound(true);
    }
  };

  const resetScan = () => {
    setScanned(false);
    setResult(null);
    setNotFound(false);
  };

  // The food in the basis the user picked. Has its own per-100 toggle so labels
  // with multiple serving columns can't mislead the log.
  // Fill vitamins/minerals the label doesn't list from a similar reference food.
  const estimate = useMicroEstimate(result);
  const base = result ? estimate.apply(result) : null;
  const active = base ? (basis === 'per100' || base.servingSize === 100 ? per100Variant(base) : base) : null;
  const servings = parseFloat(servingsText) || 0;

  const handleLog = async () => {
    if (!active || servings <= 0) return;
    const foodId = await addCustomFood(active);
    await logFood(foodId, meal, Math.round(servings * 100) / 100, date);
    await reward(10, 'meal', 'Logged a meal', 'first_meal');
    router.back();
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header />
        <View style={styles.center}>
          <MaterialCommunityIcons name="camera-off" size={56} color={colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={styles.permTitle}>Camera Access Needed</Text>
          <Text variant="bodyMedium" style={styles.permText}>
            Allow camera access to scan product barcodes.
          </Text>
          <Button mode="contained" onPress={requestPermission} style={styles.permBtn}>
            Grant Permission
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />

      {!result && !notFound && (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={scanned ? undefined : handleScan}
          />
          <View style={styles.overlay}>
            <View style={styles.scanTarget}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <View style={styles.scanLine} />
            </View>
            <Text variant="bodyMedium" style={styles.scanHint}>
              {loading ? 'Looking up product...' : 'Align the barcode within the frame'}
            </Text>
            {loading && <ActivityIndicator color="#fff" style={styles.loader} />}
          </View>
        </View>
      )}

      {notFound && (
        <View style={styles.center}>
          <MaterialCommunityIcons name="barcode-off" size={56} color={colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={styles.permTitle}>Product Not Found</Text>
          <Text variant="bodyMedium" style={styles.permText}>
            We checked Open Food Facts, USDA FoodData Central and the NIH supplement database. Try scanning again or add it manually.
          </Text>
          <Button mode="contained" onPress={resetScan} style={styles.permBtn}>Scan Again</Button>
          <Button mode="text" onPress={() => router.replace('/health/nutrition/add-custom')}>
            Add Manually
          </Button>
        </View>
      )}

      {result && active && (
        <ScrollView contentContainerStyle={styles.resultWrap}>
          <Surface style={styles.resultCard} elevation={2}>
            <Text variant="titleLarge" style={styles.resultName}>{result.name}</Text>
            {!!result.brand && <Text variant="bodyMedium" style={styles.resultBrand}>{result.brand}</Text>}
            {!!result.source && (
              <Text variant="bodySmall" style={styles.resultBrand}>Data: {SOURCE_META[result.source].label}</Text>
            )}
            <MicroEstimateNote state={estimate} />

            {result.servingSize !== 100 && (result.servingUnit === 'g' || result.servingUnit === 'ml') && (
              <>
                <Text variant="labelMedium" style={styles.mealLabel}>Log by:</Text>
                <View style={styles.mealChips}>
                  <Pill label={`Label serving (${result.servingSize}${result.servingUnit})`} compact
                    selected={basis === 'serving'} onPress={() => setBasis('serving')} />
                  <Pill label={`Per 100${result.servingUnit}`} compact
                    selected={basis === 'per100'} onPress={() => setBasis('per100')} />
                </View>
              </>
            )}

            <View style={styles.macroRow}>
              <Macro label="Cal" value={active.calories} />
              <Macro label="Protein" value={active.protein} suffix="g" />
              <Macro label="Carbs" value={active.carbs} suffix="g" />
              <Macro label="Fat" value={active.fat} suffix="g" />
            </View>
            <View style={styles.macroRow}>
              <Macro label="Fiber" value={active.fiber ?? 0} suffix="g" />
              <Macro label="Sugar" value={active.sugar ?? 0} suffix="g" />
              <Macro label="Sodium" value={active.sodium ?? 0} suffix="mg" />
            </View>
            <Text variant="labelSmall" style={styles.serving}>
              per {active.servingSize}{active.servingUnit}
            </Text>

            <Text variant="labelMedium" style={styles.mealLabel}>How much?</Text>
            <TextInput
              label={basis === 'per100' ? `Amount (×100${result.servingUnit})` : 'Servings'}
              value={servingsText}
              onChangeText={setServingsText}
              mode="outlined"
              keyboardType="numeric"
              dense
            />
            <View style={styles.quickRow}>
              {QUICK_SERVINGS.map(q => (
                <Pill key={q} label={String(q)} compact onPress={() => setServingsText(String(q))}
                  selected={servings === q} />
              ))}
            </View>
            <Text variant="titleSmall" style={{ color: colors.accentText, marginTop: spacing.xs }}>
              = {Math.round(active.calories * servings)} cal · P{Math.round(active.protein * servings)} C{Math.round(active.carbs * servings)} F{Math.round(active.fat * servings)}
              {active.fiber != null ? ` · Fib${Math.round(active.fiber * servings)}` : ''}
              {active.sodium != null ? ` · Sod${Math.round(active.sodium * servings)}mg` : ''}
            </Text>
            <FoodMicroList food={active} servings={servings} />

            <Text variant="labelMedium" style={styles.mealLabel}>Add to:</Text>
            <View style={styles.mealChips}>
              {MEALS.map(m => (
                <Pill key={m} label={m.charAt(0).toUpperCase() + m.slice(1)} compact
                  selected={meal === m} onPress={() => setMeal(m)} />
              ))}
            </View>

            <Button mode="contained" onPress={handleLog} style={styles.logBtn} disabled={servings <= 0}>
              Log Food
            </Button>
            <Button mode="text" onPress={resetScan}>Scan Again</Button>
          </Surface>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Header() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.header}>
      <IconButton icon="arrow-left" onPress={() => router.back()} />
      <Text variant="titleLarge" style={styles.title}>Scan Barcode</Text>
      <View style={{ width: 48 }} />
    </View>
  );
}

function Macro({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.macro}>
      <Text variant="titleMedium" style={styles.macroValue}>{Math.round(value * 10) / 10}{suffix}</Text>
      <Text variant="labelSmall" style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '300' },
  permTitle: { fontWeight: '300', marginTop: spacing.sm },
  permText: { color: colors.onSurfaceVariant, textAlign: 'center' },
  permBtn: { marginTop: spacing.md },
  cameraWrap: { flex: 1, margin: spacing.md, borderRadius: shape.lg, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  scanTarget: { width: 300, height: 170, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#A83232' },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 4 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 4 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 4 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 4 },
  scanLine: { position: 'absolute', height: 3, backgroundColor: '#A83232', left: 10, right: 10, top: '50%' },
  scanHint: { color: '#fff', marginTop: spacing.md, fontWeight: '400' },
  loader: { marginTop: spacing.sm },
  resultWrap: { flexGrow: 1, justifyContent: 'flex-end' },
  resultCard: { padding: spacing.lg, borderTopLeftRadius: shape.xl, borderTopRightRadius: shape.xl, backgroundColor: colors.surface },
  resultName: { fontWeight: '300' },
  resultBrand: { color: colors.onSurfaceVariant },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  macro: { alignItems: 'center' },
  macroValue: { fontWeight: '300', color: colors.accentText },
  macroLabel: { color: colors.onSurfaceVariant },
  serving: { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs },
  mealLabel: { marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '300' },
  mealChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  quickRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  logBtn: { marginTop: spacing.lg },
});
