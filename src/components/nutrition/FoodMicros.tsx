import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape } from '@/theme';
import { useUserStore } from '@/stores/userStore';
import type { Food } from '@/types';
import { foodMicros, formatAmount, shortLabel, type FoodMicro } from '@/utils/micronutrients';

/** A nutrient counts as a notable source from 10% of the daily target per
 * serving (the FDA's "good source" line; 20%+ is "high"). */
const NOTABLE_PCT = 10;
const HIGH_PCT = 20;

const pctText = (pct: number) => (pct >= 1 ? `${Math.round(pct)}%` : pct > 0 ? '<1%' : '0%');
/** Compare on the rounded figure the user sees, so "20%" is always highlighted. */
const isHigh = (pct: number | null) => pct != null && Math.round(pct) >= HIGH_PCT;

/** One line of chips on a food card: the vitamins and minerals this portion
 * gives the most of, as % of the person's daily target. */
export function FoodMicroChips({ food, servings = 1, max = 4 }: { food: Food; servings?: number; max?: number }) {
  const { colors } = useAppTheme();
  const profile = useUserStore(s => s.profile);
  const all = foodMicros(food.micros, servings, profile);
  // Reported zeros ("no B12 in almonds") aren't worth a chip or a "+N more".
  const present = all.filter(m => m.amount > 0);
  const muted = { color: colors.onSurfaceVariant };

  if (all.length === 0) {
    return <Text variant="bodySmall" style={[styles.note, muted]}>No vitamin or mineral data</Text>;
  }
  const notable = present
    .filter((m): m is FoodMicro & { pct: number } => m.pct != null && Math.round(m.pct) >= NOTABLE_PCT)
    .sort((a, b) => b.pct - a.pct);
  if (notable.length === 0) {
    return (
      <Text variant="bodySmall" style={[styles.note, muted]}>
        {present.length === 0
          ? 'No vitamins or minerals'
          : `Small amounts of ${present.length} vitamins & minerals${food.microsEstimatedFrom ? ' (est.)' : ''}`}
      </Text>
    );
  }
  const shown = notable.slice(0, max);
  const more = present.length - shown.length;
  const spoken = shown.map(m => `${m.def.label} ${Math.round(m.pct)} percent`).join(', ');
  return (
    <View style={styles.chipRow} accessibilityLabel={`Per portion: ${spoken}${more > 0 ? `, and ${more} more` : ''}. Percent of your daily target.`}>
      {shown.map(m => (
        <View key={m.def.key} style={[styles.chip, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.chipText, { color: isHigh(m.pct) ? colors.onSurface : colors.onSurfaceVariant }]}>
            {`${shortLabel(m.def.key)} ${pctText(m.pct)}`}
          </Text>
        </View>
      ))}
      {(more > 0 || !!food.microsEstimatedFrom) && (
        <Text style={[styles.chipText, muted]}>
          {[more > 0 ? `+${more} more` : '', food.microsEstimatedFrom ? 'est.' : ''].filter(Boolean).join(' · ')}
        </Text>
      )}
    </View>
  );
}

/** Every vitamin and mineral the food reports for the chosen portion, with
 * % of the daily target. Collapsed to a summary line until tapped. */
export function FoodMicroList({ food, servings, initiallyOpen = false }: { food: Food; servings: number; initiallyOpen?: boolean }) {
  const { colors } = useAppTheme();
  const profile = useUserStore(s => s.profile);
  const [open, setOpen] = useState(initiallyOpen);
  const all = foodMicros(food.micros, servings, profile);
  if (all.length === 0) return null;
  const present = all.filter(m => m.amount > 0);
  const absent = all.filter(m => m.amount === 0);
  const groups: [string, FoodMicro[]][] = [
    ['Vitamins', present.filter(m => m.def.group === 'vitamin')],
    ['Minerals', present.filter(m => m.def.group === 'mineral')],
    ['Other', present.filter(m => m.def.group === 'other')],
  ];

  return (
    <View style={[styles.listWrap, { borderColor: colors.outline }]}>
      <Pressable onPress={() => setOpen(o => !o)} style={styles.listHead} accessibilityRole="button"
        accessibilityState={{ expanded: open }}>
        <Text variant="labelLarge" style={{ color: colors.onSurface, flex: 1 }}>
          {`Vitamins & minerals (${present.length})`}
        </Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.onSurfaceVariant} />
      </Pressable>
      {open && (
        <ScrollView style={styles.listScroll} nestedScrollEnabled showsVerticalScrollIndicator>
          {groups.filter(([, items]) => items.length).map(([title, items]) => (
            <View key={title} style={styles.group}>
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{title.toUpperCase()}</Text>
              {items.map(m => (
                <View key={m.def.key} style={styles.item}>
                  <Text variant="bodySmall" style={[styles.itemName, { color: colors.onSurface }]} numberOfLines={1}>{m.def.label}</Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{`${formatAmount(m.amount)} ${m.def.unit}`}</Text>
                  <Text variant="bodySmall" style={[styles.itemPct, { color: isHigh(m.pct) ? colors.onSurface : colors.onSurfaceVariant }]}>
                    {m.pct == null ? '—' : pctText(m.pct)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
          {absent.length > 0 && (
            <Text variant="bodySmall" style={[styles.group, { color: colors.onSurfaceVariant }]}>
              {`None in this food: ${absent.map(m => shortLabel(m.def.key)).join(', ')}`}
            </Text>
          )}
          <Text variant="labelSmall" style={[styles.foot, { color: colors.onSurfaceVariant }]}>
            {`% of your daily NIH target.${food.microsEstimatedFrom ? ` Estimated from ${food.microsEstimatedFrom}.` : ''}`}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 4 },
  chip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  chipText: { fontSize: 11, fontWeight: '400', letterSpacing: 0.2 },
  listWrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: shape.md, marginTop: spacing.sm },
  listHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  listScroll: { maxHeight: 240, paddingHorizontal: spacing.sm },
  group: { marginBottom: spacing.sm, gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  itemName: { flex: 1 },
  itemPct: { minWidth: 38, textAlign: 'right' },
  foot: { marginBottom: spacing.sm, lineHeight: 15 },
});
