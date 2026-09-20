import { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, TextInput, Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { spacing, shape } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useNutritionStore } from '@/stores/nutritionStore';
import { VITAMINS, MINERALS } from '@/utils/micronutrients';

export default function AddCustomFoodScreen() {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState('g');
  const [isLiquid, setIsLiquid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');
  const [showMicros, setShowMicros] = useState(false);
  const [micros, setMicros] = useState<Record<string, string>>({});
  const { addCustomFood } = useNutritionStore();

  // Sodium is captured as a macro field above, so exclude it from the micro grid.
  const microMinerals = MINERALS.filter(m => m.key !== 'sodium');

  const buildMicros = () => {
    const out: Record<string, number> = {};
    for (const m of [...VITAMINS, ...microMinerals]) {
      const v = parseFloat(micros[m.key] || '');
      if (v > 0) out[m.key] = v;
    }
    return out;
  };

  const saveFood = async () => {
    return await addCustomFood({
      name: name.trim(),
      brand: null,
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
      micros: buildMicros(),
      isFavorite: false,
    });
  };

  const handleSaveOnly = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await saveFood();
      setSnack(`Saved "${name.trim()}" to your custom library`);
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
        <TextInput label="Food name" value={name} onChangeText={setName} style={styles.input} mode="outlined" />

        <View style={styles.twoCol}>
          <TextInput label="Serving size" value={servingSize} onChangeText={setServingSize} style={styles.halfInput} mode="outlined" keyboardType="numeric" />
          <TextInput label="Unit" value={servingUnit} onChangeText={setServingUnit} style={styles.halfInput} mode="outlined" autoCapitalize="none" />
        </View>

        <Text variant="labelMedium" style={styles.sectionTitle}>
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

        <Pressable
          onPress={() => setShowMicros(s => !s)}
          style={[styles.microToggle, { backgroundColor: colors.surface }]}
        >
          <Text variant="bodyMedium" style={{ color: colors.onSurface }}>＋ {showMicros ? 'Hide vitamins & minerals' : 'Add vitamins & minerals'}</Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{showMicros ? '⌃' : '⌄'}</Text>
        </Pressable>
        {showMicros && (
          <>
            <Text variant="titleSmall" style={styles.sectionTitle}>Vitamins (per serving)</Text>
            <View style={styles.microWrap}>
              {VITAMINS.map(m => (
                <TextInput key={m.key} label={`${m.label} (${m.unit})`} value={micros[m.key] || ''}
                  onChangeText={t => setMicros(p => ({ ...p, [m.key]: t }))}
                  style={styles.microInput} mode="outlined" keyboardType="numeric" dense />
              ))}
            </View>
            <Text variant="titleSmall" style={styles.sectionTitle}>Minerals (per serving)</Text>
            <View style={styles.microWrap}>
              {microMinerals.map(m => (
                <TextInput key={m.key} label={`${m.label} (${m.unit})`} value={micros[m.key] || ''}
                  onChangeText={t => setMicros(p => ({ ...p, [m.key]: t }))}
                  style={styles.microInput} mode="outlined" keyboardType="numeric" dense />
              ))}
            </View>
          </>
        )}

        <Text variant="labelMedium" style={styles.sectionTitle}>LIQUID?</Text>
        <View style={styles.liquidRow}>
          <ToggleButton label="Solid (g)" selected={!isLiquid} onPress={() => { setIsLiquid(false); setServingUnit('g'); }} />
          <ToggleButton label="Liquid (ml)" selected={isLiquid} onPress={() => { setIsLiquid(true); setServingUnit('ml'); }} />
        </View>

        <Button mode="contained-tonal" onPress={handleSaveOnly} style={styles.saveBtn}
          disabled={!name.trim() || saving} loading={saving}>
          Save Food
        </Button>
      </ScrollView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={1200}>{snack}</Snackbar>
    </SafeAreaView>
  );
}

function ToggleButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.toggle, { borderColor: colors.outline }, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text variant="bodyMedium" style={{ color: selected ? colors.onPrimary : colors.onSurface }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  input: { marginBottom: spacing.sm },
  twoCol: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  halfInput: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  thirdInput: { flex: 1 },
  sectionTitle: { fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm },
  microToggle: { height: 52, borderRadius: shape.md, marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  microWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  microInput: { width: '47.5%' },
  liquidRow: { flexDirection: 'row', gap: spacing.sm },
  toggle: { flex: 1, height: 40, borderWidth: 1, borderRadius: shape.md, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { marginTop: spacing.lg, borderRadius: shape.md },
});
