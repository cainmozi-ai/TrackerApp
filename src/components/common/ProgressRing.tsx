import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeContext';

interface ProgressRingProps {
  progress: number;
  size: number;
  /** Defaults to the design's proportion — the ring is ~10.6% of its diameter. */
  strokeWidth?: number;
  color: string;
  label?: string;
  value?: string;
  target?: string;
}

/** The design's ring: a Surface-2 grey track, a flat-ended accent arc and a
 * light-weight value in the centre. */
export function ProgressRing({ progress, size, strokeWidth, color, label, value, target }: ProgressRingProps) {
  const { colors } = useAppTheme();
  const stroke = strokeWidth ?? Math.round(size * 0.106);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.surfaceVariant}
            strokeWidth={stroke}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {!!value && (
          <View style={[styles.centerText, { width: size, height: size }]}>
            <Text style={[styles.value, { color: colors.onSurface, fontSize: size >= 100 ? 20 : 18 }]}>{value}</Text>
          </View>
        )}
      </View>
      {!!label && <Text variant="labelSmall" style={[styles.label, { color: colors.onSurfaceVariant }]}>{label}</Text>}
      {!!target && <Text variant="labelSmall" style={[styles.target, { color: colors.onSurfaceVariant }]}>/ {target}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 2 },
  centerText: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  value: { fontWeight: '300' },
  label: { fontWeight: '300' },
  target: { fontSize: 10 },
});
