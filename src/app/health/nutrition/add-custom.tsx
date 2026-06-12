import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, Button, Chip, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { spacing, moduleColors } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import type { MealType } from '@/types';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Weight, volume and count units a food label might use.
export const SERVING_UNITS = [
  'g', 'kg', 'mg', 'oz', 'lb',
  'ml', 'L', 'fl oz', 'cup', 'tbsp', 'tsp', 'pint', 'quart', 'gallon',
  'piece', 'slice', 'serving', 'scoop', 'bar', 'can', 'bottle', 'packet', 'egg',
];

export default function AddCustomFoodScreen() {
  const { meal } = useLocalSearchParams<{ meal?: string }>();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState('g');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    MEALS.includes(meal as MealType) ? (meal as MealType) : 'lunch'
  );
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');
  const { addCustomFood, logFood } = useNutritionStore();
  const { reward } = useUserStore();

  const saveFood = async () => {
    return await addCustomFood({
      name: name.trim(),
      brand: brand.trim() || null,
      barcode: null,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      fiber: parseFloat(fiber) || 0,
      sugar: parseFloat(sugar) || 0,
      sodium: parseFloat(sodium) || 0,
      servingSize: parseFloat(servingSize) || 100,
      servingUnit: servingUnit || 'g',
      isFavorite: false,
    });
  };

  const handleSaveAndLog = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const foodId = await saveFood();
      await logFood(foodId, selectedMeal, 1);
      await reward(10, 'meal', 'Logged a meal', 'first_meal');
      // Pop add-custom AND the search screen so the user lands back on the
      // nutrition log where the new food is now visible.
      try {
        router.dismiss(2);
      } catch {
        router.back();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await saveFood();
      setSnack(`Saved "${name.trim()}" — find it anytime by searching its name`);
      setTimeout(() => router.back(), 1200);
    } finally {
      setSaving(false);
    }
  };

  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Add Custom Food" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput label="Food Name *" value={name} onChangeText={setName} style={styles.input} mode="outlined" />
        <TextInput label="Brand (optional)" value={brand} onChangeText={setBrand} style={styles.input} mode="outlined" />

        <TextInput label="Serving Size" value={servingSize} onChangeText={setServingSize} style={styles.input} mode="outlined" keyboardType="numeric" />

        <Text variant="titleSmall" style={styles.sectionTitle}>Serving Unit</Text>
        <View style={styles.unitWrap}>
          {SERVING_UNITS.map(unit => (
            <Chip
              key={unit}
              selected={servingUnit === unit}
              onPress={() => setServingUnit(unit)}
              style={styles.unitChip}
              selectedColor={moduleColors.nutrition}
              showSelectedOverlay
              compact
            >
              {unit}
            </Chip>
          ))}
        </View>

        <Text variant="titleSmall" style={styles.sectionTitle}>
          Nutrition (per {servingSize || '1'} {servingUnit})
        </Text>

        <TextInput label="Calories" value={calories} onChangeText={setCalories} style={styles.input} mode="outlined" keyboardType="numeric" />
        <View style={styles.row}>
          <TextInput label="Protein (g)" value={protein} onChangeText={setProtein} style={styles.thirdInput} mode="outlined" keyboardType="numeric" />
          <TextInput label="Carbs (g)" value={carbs} onChangeText={setCarbs} style={styles.thirdInput} mode="outlined" keyboardType="numeric" />
          <TextInput label="Fat (g)" value={fat} onChangeText={setFat} style={styles.thirdInput} mode="outlined" keyboardType="numeric" />
        </View>
        <View style={styles.row}>
          <TextInput label="Fiber (g)" value={fiber} onChangeText={setFiber} style={styles.thirdInput} mode="outlined" keyboardType="numeric" />
          <TextInput label="Sugar (g)" value={sugar} onChangeText={setSugar} style={styles.thirdInput} mode="outlined" keyboardType="numeric" />
          <TextInput label="Sodium (mg)" value={sodium} onChangeText={setSodium} style={styles.thirdInput} mode="outlined" keyboardType="numeric" />
        </View>

        <Text variant="titleSmall" style={styles.sectionTitle}>Log To</Text>
        <View style={styles.mealChips}>
          {MEALS.map(m => (
            <Chip
              key={m}
              selected={selectedMeal === m}
              onPress={() => setSelectedMeal(m)}
              selectedColor={moduleColors.nutrition}
              showSelectedOverlay
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Chip>
          ))}
        </View>

        <Button mode="contained" onPress={handleSaveAndLog} style={styles.saveBtn}
          disabled={!name.trim() || saving} loading={saving}>
          Save & Log to {selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)}
        </Button>
        <Button mode="outlined" onPress={handleSaveOnly} style={styles.saveOnlyBtn} disabled={!name.trim() || saving}>
          Save Without Logging
        </Button>
      </ScrollView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={1200}>{snack}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  input: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  thirdInput: { flex: 1 },
  sectionTitle: { fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.sm },
  unitWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  unitChip: {},
  mealChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  saveBtn: { marginTop: spacing.lg },
  saveOnlyBtn: { marginTop: spacing.sm },
});
