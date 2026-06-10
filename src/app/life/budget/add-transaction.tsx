import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, moduleColors } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { CategoryIconPicker, type PickerCategory } from '@/components/common/CategoryIconPicker';
import { useBudgetStore } from '@/stores/budgetStore';
import { useUserStore } from '@/stores/userStore';
import type { TransactionType } from '@/types';

const FALLBACK_COLORS = ['#FF6584', '#4FC3F7', '#B388FF', '#FF8A65', '#81C784', '#FFB74D', '#90A4AE'];

export default function AddTransactionScreen() {
  const { colors } = useAppTheme();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const { addTransaction, categories, loadCategories } = useBudgetStore();
  const { reward } = useUserStore();

  useEffect(() => { loadCategories(); }, []);

  const pickerCategories: PickerCategory[] = categories.map((c, i) => ({
    name: c.name,
    icon: c.icon || 'tag',
    color: c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    await addTransaction(parsed, type, category, note.trim() || undefined);
    await reward(5, 'budget', 'Logged a transaction', 'first_transaction');
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Add Transaction" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SegmentedButtons
          value={type}
          onValueChange={v => setType(v as TransactionType)}
          buttons={[
            { value: 'expense', label: 'Expense', icon: 'arrow-up' },
            { value: 'income', label: 'Income', icon: 'arrow-down' },
          ]}
          style={styles.segmented}
        />

        <TextInput
          label="Amount" value={amount} onChangeText={setAmount} mode="outlined"
          keyboardType="numeric" left={<TextInput.Affix text="$" />} style={styles.input}
        />

        <Text variant="labelLarge" style={[styles.label, { color: colors.onBackground }]}>Category</Text>
        <CategoryIconPicker categories={pickerCategories} selected={category} onSelect={setCategory} />

        <TextInput
          label="Note (optional)" value={note} onChangeText={setNote} mode="outlined"
          placeholder="e.g. Groceries at the market" style={styles.noteInput}
        />

        <Button mode="contained" onPress={handleSave} disabled={!amount || parseFloat(amount) <= 0}
          style={styles.saveBtn} buttonColor={moduleColors.budget}>
          Save Transaction
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  segmented: { marginBottom: spacing.md },
  input: { marginBottom: spacing.md },
  label: { marginBottom: spacing.sm, fontWeight: '700' },
  noteInput: { marginTop: spacing.lg },
  saveBtn: { marginTop: spacing.lg, borderRadius: shape.pill },
});
