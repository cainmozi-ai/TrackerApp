import { StyleSheet, View, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { localDate } from '@/utils/dates';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface WeekDay {
  iso: string;
  dayNum: number;
  letter: string;
}

/** The last 7 days, oldest first, ending today. */
export function lastSevenDays(): WeekDay[] {
  const out: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ iso: localDate(d), dayNum: d.getDate(), letter: WEEKDAY_LETTERS[d.getDay()] });
  }
  return out;
}

/** The seven day pills the design puts at the top of both Home and Nutrition:
 * weekday letter over the date, the selected day outlined in the accent. */
export function WeekStrip({ selected, onSelect }: { selected: string; onSelect: (iso: string) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.strip}>
      {lastSevenDays().map(day => {
        const isSelected = day.iso === selected;
        return (
          <Pressable
            key={day.iso}
            onPress={() => onSelect(day.iso)}
            style={[styles.pill, {
              backgroundColor: isSelected ? withAlpha(accent, 0.2) : 'transparent',
              borderColor: isSelected ? accent : colors.outline,
            }]}
          >
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{day.letter}</Text>
            <Text variant="titleSmall" style={{ color: isSelected ? accent : colors.onSurface, fontWeight: '700' }}>
              {day.dayNum}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  pill: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: shape.pill, borderWidth: 1.5 },
});
