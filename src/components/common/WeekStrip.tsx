import { StyleSheet, View, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent } from '@/theme';
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

/** The seven day tiles the design puts at the top of both Home and Nutrition:
 * 46px rounded squares (Surface fill, 1.5px outline) with the weekday letter
 * over the date. The selected day keeps an accent outline so you can tell
 * which day Nutrition is showing. */
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
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={[styles.tile, {
              backgroundColor: colors.surface,
              borderColor: isSelected ? accent : colors.outline,
            }]}
          >
            <Text style={[styles.letter, { color: colors.onSurface }]}>{day.letter}</Text>
            <Text style={[styles.date, { color: isSelected ? colors.accentText : colors.onSurface }]}>{day.dayNum}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  tile: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: shape.md, borderWidth: 1.5 },
  letter: { fontSize: 10, fontWeight: '300' },
  date: { fontSize: 14, fontWeight: '300', marginTop: 1 },
});
