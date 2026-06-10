import { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Dimensions } from 'react-native';
import { Text, FAB, IconButton, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { theme, moduleColors, spacing } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useBudgetStore } from '@/stores/budgetStore';
import { useUserStore } from '@/stores/userStore';

const screenWidth = Dimensions.get('window').width;
const FALLBACK_COLORS = ['#FF6584', '#4FC3F7', '#B388FF', '#FF8A65', '#81C784', '#FFB74D', '#90A4AE'];

export default function BudgetScreen() {
  const { transactions, monthlyIncome, monthlyExpenses, categories, loadTransactions, loadCategories, deleteTransaction, getCategoryTotals } = useBudgetStore();
  const { profile, loadProfile } = useUserStore();
  const [pieData, setPieData] = useState<{ name: string; amount: number; color: string; legendFontColor: string; legendFontSize: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      loadCategories();
      loadProfile();
    }, [])
  );

  useEffect(() => {
    (async () => {
      const totals = await getCategoryTotals();
      const data = Object.entries(totals).map(([name, amount], i) => {
        const cat = categories.find(c => c.name === name);
        return {
          name,
          amount,
          color: cat?.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          legendFontColor: theme.colors.onSurface,
          legendFontSize: 12,
        };
      });
      setPieData(data);
    })();
  }, [transactions, categories]);

  const budget = profile?.monthlyBudget || 0;
  const remaining = budget - monthlyExpenses;

  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Budget" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryRow}>
          <Surface style={styles.summaryCard} elevation={1}>
            <MaterialCommunityIcons name="arrow-down-circle" size={24} color={moduleColors.habits} />
            <Text variant="titleMedium" style={{ color: moduleColors.habits, fontWeight: '700' }}>
              ${monthlyIncome.toFixed(2)}
            </Text>
            <Text variant="labelSmall" style={styles.summaryLabel}>Income</Text>
          </Surface>
          <Surface style={styles.summaryCard} elevation={1}>
            <MaterialCommunityIcons name="arrow-up-circle" size={24} color="#FF5252" />
            <Text variant="titleMedium" style={{ color: '#FF5252', fontWeight: '700' }}>
              ${monthlyExpenses.toFixed(2)}
            </Text>
            <Text variant="labelSmall" style={styles.summaryLabel}>Expenses</Text>
          </Surface>
        </View>

        {budget > 0 && (
          <Surface style={styles.budgetCard} elevation={1}>
            <ProgressRing
              progress={monthlyExpenses / budget}
              size={80}
              strokeWidth={8}
              color={remaining >= 0 ? moduleColors.budget : '#FF5252'}
              label="Budget"
              value={`$${Math.abs(remaining).toFixed(0)}`}
              target={`$${budget.toFixed(0)}`}
            />
            <Text variant="bodySmall" style={styles.budgetText}>
              {remaining >= 0 ? `$${remaining.toFixed(2)} remaining` : `$${Math.abs(remaining).toFixed(2)} over budget`}
            </Text>
          </Surface>
        )}

        {pieData.length > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleSmall" style={styles.chartTitle}>Spending by Category</Text>
            <PieChart
              data={pieData}
              width={screenWidth - spacing.md * 2}
              height={180}
              chartConfig={{ color: (o = 1) => `rgba(0,0,0,${o})` }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="8"
              absolute
            />
          </Surface>
        )}

        <Text variant="titleSmall" style={styles.sectionTitle}>Recent Transactions</Text>

        {transactions.length === 0 ? (
          <Text variant="bodyMedium" style={styles.emptyText}>
            No transactions this month
          </Text>
        ) : (
          transactions.slice(0, 20).map(t => (
            <Surface key={t.id} style={styles.transactionRow} elevation={0}>
              <View style={[styles.typeDot, { backgroundColor: t.type === 'income' ? moduleColors.habits : '#FF5252' }]} />
              <View style={styles.transactionInfo}>
                <Text variant="bodyMedium">{t.category}</Text>
                {!!t.note && <Text variant="bodySmall" style={styles.note}>{t.note}</Text>}
              </View>
              <Text variant="titleSmall" style={{ color: t.type === 'income' ? moduleColors.habits : '#FF5252', fontWeight: '600' }}>
                {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
              </Text>
              <IconButton icon="close" size={16} onPress={() => deleteTransaction(t.id)} />
            </Surface>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        onPress={() => router.push('/life/budget/add-transaction')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    gap: 4,
  },
  summaryLabel: { color: theme.colors.onSurfaceVariant },
  budgetCard: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  budgetText: { color: theme.colors.onSurfaceVariant },
  chartCard: { padding: spacing.md, borderRadius: 16, backgroundColor: theme.colors.surface, marginBottom: spacing.md },
  chartTitle: { fontWeight: '600', marginBottom: spacing.sm },
  sectionTitle: { fontWeight: '600', marginBottom: spacing.sm },
  emptyText: { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.lg },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  transactionInfo: { flex: 1 },
  note: { color: theme.colors.onSurfaceVariant },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: moduleColors.budget, borderRadius: 28 },
});
