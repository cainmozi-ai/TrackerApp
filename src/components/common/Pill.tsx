import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/theme/ThemeContext';

interface PillProps {
  label: string;
  /** Solid accent when selected; Surface-2 grey otherwise. */
  selected?: boolean;
  /** Omit for a static tag (e.g. "Compound" on an exercise). */
  onPress?: () => void;
  /** Slightly shorter, for dense rows like quick-serving presets. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The design's chip: a 34px pill, solid red with white text when selected,
 * #2A2A2C grey when not. Use it for every toggle/filter chip and static tag. */
export function Pill({ label, selected = false, onPress, compact, style }: PillProps) {
  const { colors } = useAppTheme();
  const body = [
    styles.pill,
    compact && styles.compact,
    { backgroundColor: selected ? colors.primary : colors.surfaceVariant },
    style,
  ];
  const text = (
    <Text style={[styles.label, { color: selected ? colors.onPrimary : colors.onSurface }]} numberOfLines={1}>
      {label}
    </Text>
  );
  if (!onPress) return <View style={body}>{text}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={body}>
      {text}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { height: 34, paddingHorizontal: 16, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  compact: { height: 30, paddingHorizontal: 12, borderRadius: 15 },
  label: { fontSize: 13, fontWeight: '300' },
});
