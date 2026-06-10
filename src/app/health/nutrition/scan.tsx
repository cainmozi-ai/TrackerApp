import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { lookupBarcode } from '@/services/openFoodFacts';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import type { Food, MealType } from '@/types';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Food | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [meal, setMeal] = useState<MealType>('lunch');
  const { addCustomFood, logFood } = useNutritionStore();
  const { reward } = useUserStore();

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    setNotFound(false);
    const food = await lookupBarcode(data);
    setLoading(false);
    if (food) {
      setResult(food);
    } else {
      setNotFound(true);
    }
  };

  const resetScan = () => {
    setScanned(false);
    setResult(null);
    setNotFound(false);
  };

  const handleLog = async () => {
    if (!result) return;
    const foodId = await addCustomFood(result);
    await logFood(foodId, meal, 1);
    await reward(10, 'meal', 'Logged a meal', 'first_meal');
    router.back();
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header />
        <View style={styles.center}>
          <MaterialCommunityIcons name="camera-off" size={56} color={theme.colors.onSurfaceVariant} />
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
            <View style={styles.scanFrame} />
            <Text variant="bodyMedium" style={styles.scanHint}>
              {loading ? 'Looking up product...' : 'Point at a barcode'}
            </Text>
            {loading && <ActivityIndicator color="#fff" style={styles.loader} />}
          </View>
        </View>
      )}

      {notFound && (
        <View style={styles.center}>
          <MaterialCommunityIcons name="barcode-off" size={56} color={theme.colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={styles.permTitle}>Product Not Found</Text>
          <Text variant="bodyMedium" style={styles.permText}>
            This barcode isn't in the database. Try scanning again or add it manually.
          </Text>
          <Button mode="contained" onPress={resetScan} style={styles.permBtn}>Scan Again</Button>
          <Button mode="text" onPress={() => router.replace('/health/nutrition/add-custom')}>
            Add Manually
          </Button>
        </View>
      )}

      {result && (
        <View style={styles.resultWrap}>
          <Surface style={styles.resultCard} elevation={2}>
            <Text variant="titleLarge" style={styles.resultName}>{result.name}</Text>
            {!!result.brand && <Text variant="bodyMedium" style={styles.resultBrand}>{result.brand}</Text>}
            <View style={styles.macroRow}>
              <Macro label="Cal" value={result.calories} />
              <Macro label="P" value={result.protein} />
              <Macro label="C" value={result.carbs} />
              <Macro label="F" value={result.fat} />
            </View>
            <Text variant="labelSmall" style={styles.serving}>per {result.servingSize}{result.servingUnit}</Text>

            <Text variant="labelMedium" style={styles.mealLabel}>Add to:</Text>
            <View style={styles.mealChips}>
              {MEALS.map(m => (
                <Chip key={m} selected={meal === m} onPress={() => setMeal(m)} compact style={styles.mealChip} selectedColor={moduleColors.nutrition}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Chip>
              ))}
            </View>

            <Button mode="contained" onPress={handleLog} style={styles.logBtn}>Log Food</Button>
            <Button mode="text" onPress={resetScan}>Scan Again</Button>
          </Surface>
        </View>
      )}
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <IconButton icon="arrow-left" onPress={() => router.back()} />
      <Text variant="titleLarge" style={styles.title}>Scan Barcode</Text>
      <View style={{ width: 48 }} />
    </View>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.macro}>
      <Text variant="titleMedium" style={styles.macroValue}>{Math.round(value)}</Text>
      <Text variant="labelSmall" style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  permTitle: { fontWeight: '700', marginTop: spacing.sm },
  permText: { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  permBtn: { marginTop: spacing.md },
  cameraWrap: { flex: 1, margin: spacing.md, borderRadius: 16, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 240, height: 140, borderWidth: 3, borderColor: '#fff', borderRadius: 16, backgroundColor: 'transparent' },
  scanHint: { color: '#fff', marginTop: spacing.md, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  loader: { marginTop: spacing.sm },
  resultWrap: { flex: 1, justifyContent: 'center', padding: spacing.md },
  resultCard: { padding: spacing.lg, borderRadius: 20, backgroundColor: theme.colors.surface },
  resultName: { fontWeight: '700' },
  resultBrand: { color: theme.colors.onSurfaceVariant },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  macro: { alignItems: 'center' },
  macroValue: { fontWeight: '700', color: moduleColors.nutrition },
  macroLabel: { color: theme.colors.onSurfaceVariant },
  serving: { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs },
  mealLabel: { marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '600' },
  mealChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  mealChip: { backgroundColor: theme.colors.surfaceVariant },
  logBtn: { marginTop: spacing.lg },
});
