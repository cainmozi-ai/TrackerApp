import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Ellipse } from 'react-native-svg';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/theme/ThemeContext';
import { accent, spacing, withAlpha } from '@/theme';

interface Props {
  /** Set count per high-level muscle group (Chest, Back, Shoulders, Arms, Legs, Glutes, Core, Cardio). */
  setsByGroup: Record<string, number>;
}

/** A stylised front/back body heat-map — trained muscle groups glow red with
 * intensity proportional to sets, everything else stays muted. A unique
 * finisher graphic that reflects exactly what you hit. */
export function MuscleMap({ setsByGroup }: Props) {
  const { colors } = useAppTheme();
  const max = Math.max(1, ...Object.values(setsByGroup));
  const fill = (group: string) => {
    const s = setsByGroup[group] || 0;
    if (!s) return colors.surfaceVariant;
    return withAlpha(accent, 0.35 + 0.65 * (s / max));
  };
  const skin = colors.surfaceVariant;
  const trained = Object.entries(setsByGroup).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={210} viewBox="0 0 215 200">
        {/* ---------- FRONT ---------- */}
        <Circle cx={50} cy={16} r={11} fill={skin} />
        <Rect x={45} y={25} width={10} height={7} fill={skin} />
        {/* delts */}
        <Ellipse cx={28} cy={41} rx={11} ry={8} fill={fill('Shoulders')} />
        <Ellipse cx={72} cy={41} rx={11} ry={8} fill={fill('Shoulders')} />
        {/* chest */}
        <Rect x={31} y={42} width={17} height={18} rx={6} fill={fill('Chest')} />
        <Rect x={52} y={42} width={17} height={18} rx={6} fill={fill('Chest')} />
        {/* biceps + forearms */}
        <Ellipse cx={17} cy={62} rx={7} ry={15} fill={fill('Arms')} />
        <Ellipse cx={83} cy={62} rx={7} ry={15} fill={fill('Arms')} />
        <Ellipse cx={13} cy={88} rx={6} ry={14} fill={fill('Arms')} />
        <Ellipse cx={87} cy={88} rx={6} ry={14} fill={fill('Arms')} />
        {/* abs */}
        <Rect x={40} y={62} width={20} height={34} rx={5} fill={fill('Core')} />
        {/* quads + shins */}
        <Rect x={35} y={100} width={13} height={48} rx={6} fill={fill('Legs')} />
        <Rect x={52} y={100} width={13} height={48} rx={6} fill={fill('Legs')} />
        <Rect x={37} y={152} width={10} height={38} rx={5} fill={fill('Legs')} />
        <Rect x={53} y={152} width={10} height={38} rx={5} fill={fill('Legs')} />

        {/* ---------- BACK ---------- */}
        <Circle cx={165} cy={16} r={11} fill={skin} />
        <Rect x={160} y={25} width={10} height={7} fill={skin} />
        {/* rear delts */}
        <Ellipse cx={143} cy={41} rx={11} ry={8} fill={fill('Shoulders')} />
        <Ellipse cx={187} cy={41} rx={11} ry={8} fill={fill('Shoulders')} />
        {/* back / lats */}
        <Rect x={147} y={42} width={36} height={32} rx={9} fill={fill('Back')} />
        {/* triceps + forearms */}
        <Ellipse cx={132} cy={62} rx={7} ry={15} fill={fill('Arms')} />
        <Ellipse cx={198} cy={62} rx={7} ry={15} fill={fill('Arms')} />
        <Ellipse cx={128} cy={88} rx={6} ry={14} fill={fill('Arms')} />
        <Ellipse cx={202} cy={88} rx={6} ry={14} fill={fill('Arms')} />
        {/* glutes */}
        <Rect x={150} y={92} width={30} height={18} rx={8} fill={fill('Glutes')} />
        {/* hamstrings + calves */}
        <Rect x={150} y={112} width={13} height={38} rx={6} fill={fill('Legs')} />
        <Rect x={167} y={112} width={13} height={38} rx={6} fill={fill('Legs')} />
        <Rect x={152} y={152} width={10} height={38} rx={5} fill={fill('Legs')} />
        <Rect x={168} y={152} width={10} height={38} rx={5} fill={fill('Legs')} />
      </Svg>
      <View style={styles.labels}>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Front</Text>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Back</Text>
      </View>
      {trained.length > 0 && (
        <Text variant="labelSmall" style={[styles.caption, { color: colors.onSurfaceVariant }]}>
          {trained.map(([g, n]) => `${g} ${n}`).join(' · ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  labels: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: '18%', marginTop: -6 },
  caption: { textAlign: 'center', marginTop: spacing.xs },
});
