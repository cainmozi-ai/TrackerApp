import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, IconButton, Surface, Checkbox, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, moduleColors, spacing } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useMealPlanStore, getWeekStart } from '@/stores/mealPlanStore';

export default function ShoppingListScreen() {
  const { shoppingList, loadShoppingList, toggleShoppingItem, clearShoppingList } = useMealPlanStore();
  const [weekStart] = useState(getWeekStart());

  useEffect(() => {
    loadShoppingList(weekStart);
  }, []);

  const checkedCount = shoppingList.filter(i => i.isChecked).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Shopping List"
        right={<IconButton icon="delete-sweep" onPress={() => clearShoppingList(weekStart)} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {shoppingList.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cart-outline" size={56} color={moduleColors.nutrition} />
            <Text variant="bodyMedium" style={styles.emptyText}>
              No items yet. Plan some meals and tap "Generate Shopping List".
            </Text>
            <Button mode="contained-tonal" onPress={() => router.back()} style={styles.backBtn}>
              Back to Planner
            </Button>
          </View>
        ) : (
          <>
            <Text variant="bodyMedium" style={styles.progress}>
              {checkedCount} of {shoppingList.length} items
            </Text>
            {shoppingList.map(item => (
              <Surface key={item.id} style={styles.itemRow} elevation={0}>
                <Checkbox
                  status={item.isChecked ? 'checked' : 'unchecked'}
                  onPress={() => toggleShoppingItem(item.id)}
                  color={moduleColors.nutrition}
                />
                <View style={styles.itemInfo}>
                  <Text
                    variant="bodyLarge"
                    style={[styles.itemName, item.isChecked && styles.checkedItem]}
                  >
                    {item.itemName}
                  </Text>
                  {!!item.quantity && (
                    <Text variant="labelSmall" style={styles.itemQty}>{item.quantity}</Text>
                  )}
                </View>
              </Surface>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  title: { fontWeight: '700' },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyText: { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  backBtn: { marginTop: spacing.sm },
  progress: { color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: theme.colors.surface, borderRadius: 10, marginBottom: spacing.xs },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: '500' },
  checkedItem: { textDecorationLine: 'line-through', color: theme.colors.onSurfaceVariant },
  itemQty: { color: theme.colors.onSurfaceVariant },
});
