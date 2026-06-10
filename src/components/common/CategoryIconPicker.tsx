import { StyleSheet, View, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, withAlpha } from '@/theme';

export interface PickerCategory {
  name: string;
  icon: string;
  color: string;
}

interface CategoryIconPickerProps {
  categories: PickerCategory[];
  selected: string;
  onSelect: (name: string) => void;
}

/** Grid of large, colorful category icons (Mobills/1Money style) for fast,
 * scannable selection. Used by the budget entry screen. */
export function CategoryIconPicker({ categories, selected, onSelect }: CategoryIconPickerProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.grid}>
      {categories.map(cat => {
        const active = selected === cat.name;
        return (
          <Pressable key={cat.name} style={styles.item} onPress={() => onSelect(cat.name)}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: active ? cat.color : withAlpha(cat.color, 0.15),
                  borderColor: cat.color,
                  borderWidth: active ? 0 : 1.5,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={cat.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={24}
                color={active ? '#fff' : cat.color}
              />
            </View>
            <Text
              variant="labelSmall"
              numberOfLines={1}
              style={[styles.label, { color: active ? colors.onSurface : colors.onSurfaceVariant }]}
            >
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { width: '22%', alignItems: 'center', gap: 4 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: shape.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { textAlign: 'center' },
});
