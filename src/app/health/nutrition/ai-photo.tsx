import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { isAiConfigured, recognizeFoodFromPhoto, recognizedToFood, type RecognizedFood } from '@/services/aiRecognition';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import type { MealType } from '@/types';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function AiPhotoScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<RecognizedFood[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meal, setMeal] = useState<MealType>('lunch');
  const { addCustomFood, logFood } = useNutritionStore();
  const { reward } = useUserStore();

  const configured = isAiConfigured();

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setAnalyzing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (!photo?.base64) throw new Error('Could not capture photo');
      const recognized = await recognizeFoodFromPhoto(photo.base64);
      setResults(recognized);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recognition failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogAll = async () => {
    if (!results) return;
    for (const r of results) {
      const foodId = await addCustomFood(recognizedToFood(r));
      await logFood(foodId, meal, 1);
    }
    await reward(15, 'meal', 'Logged a meal with AI', 'first_meal');
    router.back();
  };

  // --- Not configured: graceful fallback ---
  if (!configured) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header />
        <ScrollView contentContainerStyle={styles.infoContent}>
          <View style={[styles.iconCircle, { backgroundColor: moduleColors.nutrition + '20' }]}>
            <MaterialCommunityIcons name="camera-iris" size={48} color={moduleColors.nutrition} />
          </View>
          <Text variant="headlineSmall" style={styles.infoTitle}>AI Meal Recognition</Text>
          <Text variant="bodyMedium" style={styles.infoText}>
            Snap a photo of your meal and let AI estimate the calories and macros automatically.
          </Text>

          <Surface style={styles.setupCard} elevation={1}>
            <Text variant="titleSmall" style={styles.setupTitle}>To enable this feature:</Text>
            <Text variant="bodySmall" style={styles.setupStep}>
              1. Get a free API key at aistudio.google.com/app/apikey
            </Text>
            <Text variant="bodySmall" style={styles.setupStep}>
              2. Create a file named <Text style={styles.code}>.env</Text> in the project root
            </Text>
            <Text variant="bodySmall" style={styles.setupStep}>
              3. Add: <Text style={styles.code}>EXPO_PUBLIC_GEMINI_API_KEY=your_key</Text>
            </Text>
            <Text variant="bodySmall" style={styles.setupStep}>
              4. Restart the app
            </Text>
          </Surface>

          <Button mode="contained" icon="magnify" onPress={() => router.replace('/health/nutrition/search')} style={styles.fallbackBtn}>
            Search Foods Instead
          </Button>
          <Button mode="text" icon="barcode-scan" onPress={() => router.replace('/health/nutrition/scan')}>
            Scan a Barcode
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={theme.colors.primary} /></SafeAreaView>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header />
        <View style={styles.center}>
          <MaterialCommunityIcons name="camera-off" size={56} color={theme.colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={styles.infoTitle}>Camera Access Needed</Text>
          <Button mode="contained" onPress={requestPermission} style={styles.fallbackBtn}>Grant Permission</Button>
        </View>
      </SafeAreaView>
    );
  }

  // --- Results view ---
  if (results) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header />
        <ScrollView contentContainerStyle={styles.resultsContent}>
          {results.length === 0 ? (
            <Text variant="bodyMedium" style={styles.infoText}>
              Couldn't identify any foods. Try another photo.
            </Text>
          ) : (
            <>
              <Text variant="titleSmall" style={styles.resultsTitle}>Detected Foods</Text>
              {results.map((r, i) => (
                <Surface key={i} style={styles.foodCard} elevation={1}>
                  <Text variant="titleSmall">{r.name}</Text>
                  <Text variant="bodySmall" style={styles.foodMacros}>
                    {Math.round(r.calories)} cal · P:{Math.round(r.protein)}g C:{Math.round(r.carbs)}g F:{Math.round(r.fat)}g
                  </Text>
                </Surface>
              ))}
              <Text variant="labelMedium" style={styles.mealLabel}>Add to:</Text>
              <View style={styles.mealChips}>
                {MEALS.map(m => (
                  <Chip key={m} selected={meal === m} onPress={() => setMeal(m)} compact style={styles.mealChip} selectedColor={moduleColors.nutrition}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Chip>
                ))}
              </View>
              <Button mode="contained" onPress={handleLogAll} style={styles.fallbackBtn}>Log All Foods</Button>
            </>
          )}
          <Button mode="text" onPress={() => setResults(null)}>Take Another Photo</Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Camera view ---
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        {analyzing && (
          <View style={styles.analyzeOverlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text variant="titleMedium" style={styles.analyzeText}>Analyzing your meal...</Text>
          </View>
        )}
      </View>
      {!!error && <Text variant="bodySmall" style={styles.errorText}>{error}</Text>}
      <View style={styles.captureBar}>
        <Button mode="contained" icon="camera" onPress={handleCapture} disabled={analyzing} style={styles.captureBtn}>
          Capture & Analyze
        </Button>
      </View>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <IconButton icon="arrow-left" onPress={() => router.back()} />
      <Text variant="titleLarge" style={styles.title}>AI Meal Photo</Text>
      <View style={{ width: 48 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  infoContent: { padding: spacing.lg, alignItems: 'center' },
  iconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginVertical: spacing.md },
  infoTitle: { fontWeight: '700', marginTop: spacing.sm },
  infoText: { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginVertical: spacing.sm },
  setupCard: { padding: spacing.md, borderRadius: 16, backgroundColor: theme.colors.surface, alignSelf: 'stretch', marginVertical: spacing.md, gap: spacing.xs },
  setupTitle: { fontWeight: '600', marginBottom: spacing.xs },
  setupStep: { color: theme.colors.onSurfaceVariant, lineHeight: 20 },
  code: { fontFamily: 'monospace', color: theme.colors.primary, backgroundColor: theme.colors.surfaceVariant },
  fallbackBtn: { marginTop: spacing.md, alignSelf: 'stretch' },
  cameraWrap: { flex: 1, margin: spacing.md, borderRadius: 16, overflow: 'hidden' },
  camera: { flex: 1 },
  analyzeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  analyzeText: { color: '#fff' },
  errorText: { color: theme.colors.error, textAlign: 'center', paddingHorizontal: spacing.md },
  captureBar: { padding: spacing.md },
  captureBtn: { borderRadius: 12 },
  resultsContent: { padding: spacing.md },
  resultsTitle: { fontWeight: '700', marginBottom: spacing.sm },
  foodCard: { padding: spacing.md, borderRadius: 12, backgroundColor: theme.colors.surface, marginBottom: spacing.sm },
  foodMacros: { color: theme.colors.onSurfaceVariant, marginTop: 2 },
  mealLabel: { marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '600' },
  mealChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  mealChip: { backgroundColor: theme.colors.surfaceVariant },
});
