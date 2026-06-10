import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useNutritionStore } from '@/stores/nutritionStore';

export default function AddCustomFoodScreen() {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState('g');
  const { addCustomFood } = useNutritionStore();

  const handleSave = async () => {
    if (!name.trim()) return;
    await addCustomFood({
      name: name.trim(),
      brand: brand.trim() || null,
      barcode: null,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      fiber: parseFloat(fiber) || 0,
      sugar: parseFloat(sugar) || 0,
      sodium: null,
      servingSize: parseFloat(servingSize) || 100,
      servingUnit: servingUnit || 'g',
      isFavorite: false,
    });
    router.back();
  };

  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Add Custom Food" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput label="Food Name *" value={name} onChangeText={setName} style={styles.input} mode="outlined" />
        <TextInput label="Brand (optional)" value={brand} onChangeText={setBrand} style={styles.input} mode="outlined" />

        <View style={styles.row}>
          <TextInput label="Serving Size" value={servingSize} onChangeText={setServingSize} style={styles.halfInput} mode="outlined" keyboardType="numeric" />
          <TextInput label="Unit" value={servingUnit} onChangeText={setServingUnit} style={styles.halfInput} mode="outlined" />
        </View>

        <Text variant="titleSmall" style={styles.sectionTitle}>Nutrition (per serving)</Text>

        <TextInput label="Calories" value={calories} onChangeText={setCalories} style={styles.input} mode="outlined" keyboardType="numeric" />
        <View style={styles.row}>
          <TextInput label="Protein (g)" value={protein} onChangeText={setProtein} style={styles.thirdInput} mode="outlined" keyboardType="numeric" />
          <TextInput label="Carbs (g)" value={carbs} onChangeText={setCarbs} style={styles.thirdInput} mode="outlined" keyboardType="numeric" />
          <TextInput label="Fat (g)" value={fat} onChangeText={setFat} style={styles.thirdInput} mode="outlined" keyboardType="numeric" />
        </View>
        <View style={styles.row}>
          <TextInput label="Fiber (g)" value={fiber} onChangeText={setFiber} style={styles.halfInput} mode="outlined" keyboardType="numeric" />
          <TextInput label="Sugar (g)" value={sugar} onChangeText={setSugar} style={styles.halfInput} mode="outlined" keyboardType="numeric" />
        </View>

        <Button mode="contained" onPress={handleSave} style={styles.saveBtn} disabled={!name.trim()}>
          Save Food
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  input: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  halfInput: { flex: 1 },
  thirdInput: { flex: 1 },
  sectionTitle: { fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.sm },
  saveBtn: { marginTop: spacing.lg },
});
