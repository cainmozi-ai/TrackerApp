import { Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeContext';
import { shape, spacing, motion } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MotionCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Index in a list — used to stagger the entrance animation. */
  index?: number;
  /** Disable the entrance animation (e.g. for items already on screen). */
  noEnter?: boolean;
}

/** A surface card with a spring press-scale and a staggered fade-in-up entrance.
 * Dark-mode aware. Use as the standard container for tappable content. */
export function MotionCard({ children, onPress, style, index = 0, noEnter }: MotionCardProps) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const surface: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: shape.lg,
    padding: spacing.md,
  };

  const entering = noEnter ? undefined : FadeInUp.delay(Math.min(index, 8) * 30).duration(240);

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, motion.snappy); }}
        onPressOut={() => { scale.value = withSpring(1, motion.snappy); }}
        entering={entering}
        style={[styles.shadow, surface, animatedStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View entering={entering} style={[styles.shadow, surface, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
});
