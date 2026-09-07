import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';
import { accent, spacing } from '@/theme';
import { AppCard } from '@/components/common/AppCard';
import { SectionHeader } from '@/components/common/SectionHeader';

export default function LearnScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="headlineMedium" style={[styles.title, { color: colors.onBackground }]}>Learn</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Learn about the body with topics like Myology, Biomechanics, Basic Anatomy and Nutrition.
        </Text>

        <SectionHeader title="Modules" />

        <AppCard index={0} title="Nutrition" icon="food-apple" color={accent}
          subtitle="Understand macros and micros" onPress={() => router.push('/learn/nutrition')} />
        <AppCard index={1} title="Myology" icon="arm-flex" color={accent}
          subtitle="Study the muscles in the body" onPress={() => router.push('/learn/myology')} />
        <AppCard index={2} title="Biomechanics" icon="cog-outline" color={accent}
          subtitle="Study the biomechanics of your body" onPress={() => router.push('/learn/biomechanics')} />
        <AppCard index={3} title="Basic Anatomy" icon="human" color={accent}
          subtitle="Get a basic grasp of human anatomy" onPress={() => router.push('/learn/anatomy')} />
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
