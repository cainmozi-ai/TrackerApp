import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeContext';
import { withAlpha } from '@/theme';

interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  label?: string;
  value?: string;
  target?: string;
}

export function ProgressRing({ progress, size, strokeWidth, color, label, value, target }: ProgressRingProps) {
  const { colors } = useAppTheme();
  const radius = (size - strokeWidth) / 2;
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
            stroke={withAlpha(color, 0.18)}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {!!value && (
          <View style={[styles.centerText, { width: size, height: size }]}>
            <Text variant="titleMedium" style={[styles.value, { color }]}>{value}</Text>
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
  value: { fontWeight: '800' },
  label: { fontWeight: '600' },
  target: { fontSize: 10 },
});
