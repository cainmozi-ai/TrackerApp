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
        <AppCard index={1} title="Micronutrients" icon="pill" color="#7ED957"
          subtitle="Vitamins & minerals vs daily targets" onPress={() => router.push('/health/micronutrients')} />
        <AppCard index={2} title="Water Intake" icon="cup-water" color={moduleColors.water}
          subtitle="Stay hydrated throughout the day" onPress={() => router.push('/health/water')} />
        <AppCard index={3} title="Sleep Log" icon="moon-waning-crescent" color={moduleColors.sleep}
          subtitle="Track your sleep patterns" onPress={() => router.push('/health/sleep')} />
        <AppCard index={4} title="Weight" icon="scale-bathroom" color={accent}
          subtitle="Log weight & see your smoothed trend" onPress={() => router.push('/health/weight')} />
        <AppCard index={5} title="Body Tracker" icon="tape-measure" color="#7E57C2"
          subtitle="Measurements & progress photos" onPress={() => router.push('/health/measurements')} />
        <AppCard index={6} title="Coach" icon="chart-bell-curve-cumulative" color={accent}
          subtitle="Adaptive expenditure & target recommendations" onPress={() => router.push('/health/coach')} />
        <AppCard index={7} title="Meal Planner" icon="calendar-month" color={moduleColors.nutrition}
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
