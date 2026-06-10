import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { moduleColors, spacing, shape } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { MotionCard } from '@/components/common/MotionCard';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useWaterStore } from '@/stores/waterStore';
import { useUserStore } from '@/stores/userStore';

const QUICK_ADD = [
  { label: '+1 Glass', ml: 250, icon: 'cup' },
  { label: '+250ml', ml: 250, icon: 'cup-water' },
  { label: '+500ml', ml: 500, icon: 'bottle-soda' },
  { label: '+1L', ml: 1000, icon: 'bottle-soda-classic' },
];

export default function WaterScreen() {
  const { colors } = useAppTheme();
  const { todayLogs, todayTotal, loadTodayLogs, addWater, removeLog } = useWaterStore();
  const { profile, loadProfile, reward } = useUserStore();

  useEffect(() => {
    loadTodayLogs();
    loadProfile();
  }, []);

  const target = (profile?.waterTarget || 8) * 250;
  const glasses = Math.floor(todayTotal / 250);
  const targetGlasses = profile?.waterTarget || 8;

  const handleAdd = async (ml: number) => {
    await addWater(ml);
    const total = useWaterStore.getState().todayTotal;
    if (total >= target && total - ml < target) {
      await reward(15, 'water', 'Hit daily water goal', 'water_goal');
    } else {
      await reward(2, 'water', 'Logged water', 'first_water');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Water Intake" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <MotionCard style={styles.ringCard} noEnter>
          <ProgressRing
            progress={todayTotal / target}
            size={170}
            strokeWidth={16}
            color={moduleColors.water}
            value={`${glasses}`}
            label={`of ${targetGlasses} glasses`}
          />
          <Text variant="bodyMedium" style={[styles.mlText, { color: colors.onSurfaceVariant }]}>
            {todayTotal}ml / {target}ml
          </Text>
        </MotionCard>

        <View style={styles.quickActions}>
          {QUICK_ADD.map(item => (
            <Button key={item.label} mode="contained-tonal" icon={item.icon}
              onPress={() => handleAdd(item.ml)} style={styles.quickBtn}>
              {item.label}
            </Button>
          ))}
        </View>

        {todayLogs.length > 0 && (
          <View style={styles.logSection}>
            <Text variant="titleSmall" style={[styles.logTitle, { color: colors.onBackground }]}>Today's Log</Text>
            {todayLogs.map(log => (
              <View key={log.id} style={[styles.logRow, { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons name="water" size={20} color={moduleColors.water} />
                <Text variant="bodyMedium" style={{ color: colors.onSurface, flex: 1 }}>{log.amountMl}ml</Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{log.logTime?.slice(0, 5)}</Text>
                <IconButton icon="close" size={16} onPress={() => removeLog(log.id)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MaterialIconDrop({ color }: { color: string }) {
  const { MaterialCommunityIcons } = require('@expo/vector-icons');
  return <MaterialCommunityIcons name="water" size={20} color={color} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, alignItems: 'center' },
  ringCard: { alignItems: 'center', alignSelf: 'stretch', paddingVertical: spacing.xl, gap: spacing.sm, marginBottom: spacing.lg },
  mlText: {},
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.xl },
  quickBtn: { minWidth: 110 },
  logSection: { alignSelf: 'stretch' },
  logTitle: { fontWeight: '700', marginBottom: spacing.sm },
  logRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.xs, paddingLeft: spacing.md, borderRadius: shape.sm, marginBottom: spacing.xs, gap: spacing.sm },
});
