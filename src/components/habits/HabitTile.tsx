import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeContext';
import { moduleColors, spacing, shape, withAlpha, motion } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SIZE = 84;

interface HabitTileProps {
  name: string;
  icon?: string | null;
  done: boolean;
  streak: number;
  onToggle: () => void;
  onLongPress: () => void;
}

/** Streaks-style circular tile: tap to complete (spring pop + fill), long-press
 * for stats/detail. */
export function HabitTile({ name, icon, done, streak, onToggle, onLongPress }: HabitTileProps) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleToggle = () => {
    scale.value = withSequence(withSpring(1.15, motion.snappy), withSpring(1, motion.bouncy));
    onToggle();
  };

  return (
    <View style={styles.wrap}>
      <AnimatedPressable
        onPress={handleToggle}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={[
          styles.circle,
          animStyle,
          done
            ? { backgroundColor: moduleColors.habits }
            : { backgroundColor: withAlpha(moduleColors.habits, 0.12), borderWidth: 2, borderColor: withAlpha(moduleColors.habits, 0.5) },
        ]}
      >
        <MaterialCommunityIcons
          name={(done ? 'check-bold' : (icon as keyof typeof MaterialCommunityIcons.glyphMap) || 'circle-outline')}
          size={done ? 34 : 26}
          color={done ? '#fff' : moduleColors.habits}
        />
      </AnimatedPressable>
      <Text variant="labelMedium" numberOfLines={1} style={[styles.name, { color: colors.onSurface }]}>{name}</Text>
      {streak > 0 ? (
        <View style={styles.streakRow}>
          <MaterialCommunityIcons name="fire" size={13} color="#FF7043" />
          <Text variant="labelSmall" style={styles.streakText}>{streak}</Text>
        </View>
      ) : (
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>—</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '33.33%', alignItems: 'center', marginBottom: spacing.lg, gap: 4 },
  circle: { width: SIZE, height: SIZE, borderRadius: shape.pill, justifyContent: 'center', alignItems: 'center' },
  name: { textAlign: 'center', maxWidth: SIZE + 16 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakText: { color: '#FF7043', fontWeight: '700' },
});
