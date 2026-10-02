import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, TextInput, Button, Snackbar, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { spacing, shape } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useNutritionStore } from '@/stores/nutritionStore';
import { estimateMicros } from '@/services/foodSources/estimate';
import { VITAMINS, MINERALS, OTHER_NUTRIENTS, type MicroDef } from '@/utils/micronutrients';
import type { Food } from '@/types';

/** Create a food, or edit one already in your library (`?id=`), including
 * removing vitamins/minerals that were estimated rather than read from the
 * label, and turning estimates off for that food. */
export default function FoodFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const foodId = id ? parseInt(id, 10) : NaN;
  const editing = !isNaN(foodId);

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
  const [isLiquid, setIsLiquid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');
  const [showMicros, setShowMicros] = useState(false);
  const [micros, setMicros] = useState<Record<string, string>>({});
  // Which micros came from an estimate rather than the label, and from what.
  const [estimatedKeys, setEstimatedKeys] = useState<string[]>([]);
  const [estimatedFrom, setEstimatedFrom] = useState<string | null>(null);
  const [noEstimate, setNoEstimate] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimateMsg, setEstimateMsg] = useState('');
  const [loaded, setLoaded] = useState(!editing);
  const { addCustomFood, getFood, updateFood } = useNutritionStore();
  const { colors } = useAppTheme();

  // Sodium is captured as a macro field above, so exclude it from the micro grid.
  const microMinerals = MINERALS.filter(m => m.key !== 'sodium');
  const microDefs = [...VITAMINS, ...microMinerals, ...OTHER_NUTRIENTS];

  useEffect(() => {
    if (!editing) return;
    getFood(foodId).then(f => {
      if (!f) { setSnack('That food no longer exists'); return; }
      const str = (v: number | null | undefined) => (v == null ? '' : String(v));
      setName(f.name);
      setBrand(f.brand ?? '');
      setCalories(str(f.calories));
      setProtein(str(f.protein));
      setCarbs(str(f.carbs));
      setFat(str(f.fat));
      setFiber(str(f.fiber));
      setSugar(str(f.sugar));
      setSodium(str(f.sodium));
      setServingSize(str(f.servingSize));
      setServingUnit(f.servingUnit);
      setIsLiquid(f.servingUnit === 'ml');
      setMicros(Object.fromEntries(Object.entries(f.micros || {}).map(([k, v]) => [k, String(v)])));
      // Foods estimated before the keys were recorded: treat every micro as estimated.
      setEstimatedKeys(f.microsEstimatedKeys ?? (f.microsEstimatedFrom ? Object.keys(f.micros || {}) : []));
      setEstimatedFrom(f.microsEstimatedFrom ?? null);
      setNoEstimate(!!f.noEstimate);
      setShowMicros(true);
      setLoaded(true);
    });
  }, [foodId]);

  const num = (t: string) => parseFloat(t) || 0;
  /** Blank means "not on the label" (unknown), not zero. */
  const optional = (t: string) => (t.trim() ? num(t) : null);

  const buildMicros = () => {
    const out: Record<string, number> = {};
    for (const m of microDefs) {
      const t = micros[m.key];
      if (!t?.trim()) continue;
      const v = parseFloat(t);
      if (isFinite(v) && v >= 0) out[m.key] = v;
    }
    return out;
  };

  /** The form as a Food (used for saving and for finding an estimate). */
  const formFood = (): Omit<Food, 'id' | 'createdAt' | 'isCustom'> => {
    const builtMicros = buildMicros();
    const keys = estimatedKeys.filter(k => builtMicros[k] != null);
    return {
      name: name.trim(),
      brand: brand.trim() || null,
      barcode: null,
      calories: num(calories),
      protein: num(protein),
      carbs: num(carbs),
      fat: num(fat),
      fiber: optional(fiber),
      sugar: optional(sugar),
      sodium: optional(sodium),
      servingSize: num(servingSize) || 100,
      servingUnit: servingUnit.trim() || 'g',
      micros: builtMicros,
      microsEstimatedFrom: keys.length ? estimatedFrom : null,
      microsEstimatedKeys: keys,
      noEstimate,
      isFavorite: false,
    };
  };

  const setMicro = (key: string, text: string) => {
    setMicros(p => ({ ...p, [key]: text }));
    // A value typed in by hand is no longer an estimate.
    setEstimatedKeys(keys => keys.filter(k => k !== key));
  };

  const removeEstimate = () => {
    setMicros(p => Object.fromEntries(Object.entries(p).filter(([k]) => !estimatedKeys.includes(k))));
    setEstimatedKeys([]);
    setEstimatedFrom(null);
    setNoEstimate(true);
    setEstimateMsg('Estimated values removed. This food won’t be estimated again unless you turn estimates back on.');
  };

  const estimateNow = async () => {
    setEstimating(true);
    setEstimateMsg('');
    try {
      const food = { ...formFood(), id: 0, createdAt: '', isCustom: true } as Food;
      const est = await estimateMicros(food);
      if (!est) {
        setEstimateMsg('No reference food was close enough to estimate from. Check the calories and macros above.');
        return;
      }
      const added = Object.keys(est.micros).filter(k => !micros[k]?.trim());
      setMicros(p => ({ ...p, ...Object.fromEntries(added.map(k => [k, String(est.micros[k])])) }));
      setEstimatedKeys(keys => [...new Set([...keys, ...added])]);
      setEstimatedFrom(est.from);
      setNoEstimate(false);
      setEstimateMsg(added.length ? `Filled ${added.length} values from ${est.from}.` : 'Every value is already filled in.');
    } finally {
      setEstimating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        const { isFavorite: _fav, ...food } = formFood();
        await updateFood(foodId, food);
        setSnack('Saved. Changes apply to every day this food is logged.');
      } else {
        await addCustomFood(formFood());
        setSnack(`Saved "${name.trim()}" to your custom library`);
      }
      setTimeout(() => router.back(), 1200);
    } finally {
      setSaving(false);
    }
  };

  const microInput = (m: MicroDef) => {
    const est = estimatedKeys.includes(m.key);
    return (
      <TextInput key={m.key} label={`${m.label} (${m.unit})${est ? ' · est.' : ''}`} value={micros[m.key] || ''}
        onChangeText={t => setMicro(m.key, t)} style={styles.microInput} mode="outlined" keyboardType="numeric" dense
        outlineStyle={est ? { borderStyle: 'dashed' } : undefined} />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title={editing ? 'Edit Food' : 'Create Food'} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {editing && (
          <Text variant="bodySmall" style={[styles.note, { color: colors.onSurfaceVariant }]}>
            Changes apply to every day you’ve logged this food.
          </Text>
        )}
        <TextInput label="Food name" value={name} onChangeText={setName} style={styles.input} mode="outlined" />
        <TextInput label="Brand (optional)" value={brand} onChangeText={setBrand} style={styles.input} mode="outlined" />

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
          accessibilityRole="button"
          accessibilityState={{ expanded: showMicros }}
        >
          <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
            {showMicros ? 'Hide vitamins & minerals' : editing ? 'Vitamins & minerals' : '＋ Add vitamins & minerals'}
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{showMicros ? '⌃' : '⌄'}</Text>
        </Pressable>
        {showMicros && loaded && (
          <>
            <View style={[styles.estimateCard, { backgroundColor: colors.surface }]}>
              {estimatedKeys.length > 0 ? (
                <>
                  <Text variant="bodySmall" style={{ color: colors.onSurface }}>
                    {`${estimatedKeys.length} values marked “est.” were estimated from ${estimatedFrom ?? 'a similar food'}, not read from the label.`}
                  </Text>
                  <Button mode="outlined" icon="close" onPress={removeEstimate} textColor={colors.onSurface} style={styles.estimateBtn}>
                    Remove estimated values
                  </Button>
                </>
              ) : (
                <Button mode="outlined" icon="auto-fix" onPress={estimateNow} loading={estimating} disabled={estimating}
                  textColor={colors.onSurface} style={styles.estimateBtn}>
                  Estimate from similar food
                </Button>
              )}
              <View style={styles.switchRow}>
                <Text variant="bodyMedium" style={{ color: colors.onSurface, flex: 1 }}>Estimate missing vitamins & minerals</Text>
                <Switch value={!noEstimate} onValueChange={v => setNoEstimate(!v)} color={colors.primary}
                  accessibilityLabel="Estimate missing vitamins and minerals for this food" />
              </View>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                Turn off for foods that don’t contain them; the app won’t estimate them for this food again.
              </Text>
              {!!estimateMsg && (
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: spacing.xs }}>{estimateMsg}</Text>
              )}
            </View>

            <Text variant="titleSmall" style={styles.sectionTitle}>Vitamins (per serving)</Text>
            <View style={styles.microWrap}>{VITAMINS.map(microInput)}</View>
            <Text variant="titleSmall" style={styles.sectionTitle}>Minerals (per serving)</Text>
            <View style={styles.microWrap}>{microMinerals.map(microInput)}</View>
            <Text variant="titleSmall" style={styles.sectionTitle}>Other (per serving)</Text>
            <View style={styles.microWrap}>{OTHER_NUTRIENTS.map(microInput)}</View>
            <Text variant="bodySmall" style={[styles.note, { color: colors.onSurfaceVariant, marginTop: spacing.sm }]}>
              Leave a box blank if the label doesn’t list it; enter 0 if the label says it has none.
            </Text>
          </>
        )}

        <Text variant="labelMedium" style={styles.sectionTitle}>LIQUID?</Text>
        <View style={styles.liquidRow}>
          <ToggleButton label="Solid (g)" selected={!isLiquid} onPress={() => { setIsLiquid(false); setServingUnit('g'); }} />
          <ToggleButton label="Liquid (ml)" selected={isLiquid} onPress={() => { setIsLiquid(true); setServingUnit('ml'); }} />
        </View>

        <Button mode="contained-tonal" onPress={handleSave} style={styles.saveBtn}
          disabled={!name.trim() || saving || !loaded} loading={saving}>
          {editing ? 'Save Changes' : 'Save Food'}
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
  note: { marginBottom: spacing.sm, lineHeight: 17 },
  input: { marginBottom: spacing.sm },
  twoCol: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  halfInput: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  thirdInput: { flex: 1 },
  sectionTitle: { fontWeight: '300', marginTop: spacing.md, marginBottom: spacing.sm },
  microToggle: { height: 52, borderRadius: shape.md, marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  estimateCard: { borderRadius: shape.md, padding: spacing.md, marginTop: spacing.sm, gap: spacing.xs },
  estimateBtn: { alignSelf: 'flex-start', borderRadius: shape.md, marginVertical: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  microWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  microInput: { width: '47.5%' },
  liquidRow: { flexDirection: 'row', gap: spacing.sm },
  toggle: { flex: 1, height: 40, borderWidth: 1, borderRadius: shape.md, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { marginTop: spacing.lg, borderRadius: shape.md },
});
