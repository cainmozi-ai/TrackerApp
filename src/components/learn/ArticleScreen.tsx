import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';

export interface ArticleSection {
  heading: string;
  body?: string;
  bullets?: { term: string; text: string }[];
}

/** Shared layout for the Learn educational screens: header + intro + content
 * cards, matching the design's dark card style with the red accent. */
export function ArticleScreen({ title, intro, sections }: { title: string; intro: string; sections: ArticleSection[] }) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title={title} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text variant="bodyMedium" style={[styles.intro, { color: colors.onSurfaceVariant }]}>{intro}</Text>
        {sections.map((s, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.headRow}>
              <View style={[styles.dot, { backgroundColor: accent }]} />
              <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '300' }}>{s.heading}</Text>
            </View>
            {!!s.body && (
              <Text variant="bodyMedium" style={{ color: colors.onSurface, lineHeight: 22 }}>{s.body}</Text>
            )}
            {s.bullets?.map((b, j) => (
              <View key={j} style={styles.bulletRow}>
                <MaterialCommunityIcons name="circle-medium" size={18} color={accent} />
                <Text variant="bodyMedium" style={{ color: colors.onSurface, flex: 1, lineHeight: 21 }}>
                  <Text style={{ fontWeight: '300' }}>{b.term}</Text>
                  {b.term ? ' — ' : ''}{b.text}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  intro: { marginBottom: spacing.md, lineHeight: 21 },
  card: { borderRadius: shape.lg, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2, marginTop: 4 },
});
