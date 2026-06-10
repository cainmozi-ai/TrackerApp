import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { moduleColors, spacing, accent } from '@/theme';
import { AppCard } from '@/components/common/AppCard';
import { SectionHeader } from '@/components/common/SectionHeader';

export default function HealthScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="headlineMedium" style={[styles.title, { color: colors.onBackground }]}>Health</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Track your nutrition, hydration, and sleep
        </Text>

        <SectionHeader title="Modules" />

        <AppCard index={0} title="Nutrition" icon="food-apple" color={moduleColors.nutrition}
          subtitle="Track calories, macros & meals" onPress={() => router.push('/health/nutrition')} />
        <AppCard index={1} title="Water Intake" icon="cup-water" color={moduleColors.water}
          subtitle="Stay hydrated throughout the day" onPress={() => router.push('/health/water')} />
        <AppCard index={2} title="Sleep Log" icon="moon-waning-crescent" color={moduleColors.sleep}
          subtitle="Track your sleep patterns" onPress={() => router.push('/health/sleep')} />
        <AppCard index={3} title="Weight" icon="scale-bathroom" color={accent}
          subtitle="Log weight & see your smoothed trend" onPress={() => router.push('/health/weight')} />
        <AppCard index={4} title="Coach" icon="chart-bell-curve-cumulative" color={accent}
          subtitle="Adaptive expenditure & target recommendations" onPress={() => router.push('/health/coach')} />
        <AppCard index={5} title="Meal Planner" icon="calendar-month" color={moduleColors.nutrition}
          subtitle="Plan meals & generate shopping lists" onPress={() => router.push('/health/meal-planner')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { fontWeight: '800' },
  subtitle: { marginTop: 2, marginBottom: spacing.md },
});
