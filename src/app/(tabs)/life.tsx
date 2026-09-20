import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { shape, spacing } from '@/theme';

export default function LearnScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text variant="headlineMedium" style={[styles.title, { color: colors.onBackground }]}>Learn</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Learn about the body with topics like Myology, Biomechanics, Basic Anatomy and Nutrition.
        </Text>

        <Text variant="labelSmall" style={[styles.kicker, { color: colors.onSurfaceVariant }]}>MODULES</Text>
        <LearnRow title="Nutrition" subtitle="Understand Macros and Micros" icon="food-apple" iconColor="#BDB6A0" iconBg="#343330" onPress={() => router.push('/learn/nutrition')} />
        <LearnRow title="Myology" subtitle="Study Muscles in the body" icon="arm-flex" iconColor="#BC0E0E" iconBg="#381B1B" onPress={() => router.push('/learn/myology')} />
        <LearnRow title="Biomechanics" subtitle="Study the Biomechanics of your body" icon="cog-outline" iconColor="#A8C2BC" iconBg="#283431" onPress={() => router.push('/learn/biomechanics')} />
        <LearnRow title="Basic Anatomy" subtitle="Get a basic grasp of the human anatomy" icon="human" iconColor="#BC0E0E" iconBg="#381B1B" onPress={() => router.push('/learn/anatomy')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LearnRow({ title, subtitle, icon, iconColor, iconBg, onPress }: {
  title: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; iconColor: string; iconBg: string; onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { backgroundColor: colors.surface }]}> 
      <View style={[styles.iconTile, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowCopy}>
        <Text variant="titleMedium" style={{ color: colors.onSurface }}>{title}</Text>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.onSurface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { fontWeight: '400' },
  subtitle: { marginTop: 2, marginBottom: spacing.xs, lineHeight: 15 },
  kicker: { fontWeight: '700', marginBottom: spacing.sm },
  row: { height: 72, borderRadius: shape.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  iconTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 1 },
});
