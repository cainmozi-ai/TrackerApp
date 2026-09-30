import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape } from '@/theme';
import {
  MICRO_BY_KEY, targetFor, upperLimitFor, amountTowardLimit, basisLabel, profileLabel, formatAmount,
  type NutrientProfile,
} from '@/utils/micronutrients';

interface Props {
  nutrientKey: string | null;
  onDismiss: () => void;
  profile: NutrientProfile | null;
  /** Today's total from all logged foods. */
  amount: number;
  /** The part of today's total that came from supplements (form-specific for folate/vitamin A). */
  fromSupplements: number;
  /** How many of today's foods report this nutrient, out of `logCount`. */
  coverage: number;
  logCount: number;
  /** How many of today's foods have values estimated from a similar food. */
  estimatedCount?: number;
}

const SCOPE_TITLE = {
  total: 'Upper limit (UL)',
  supplemental: 'Upper limit from supplements (UL)',
  preformed: 'Upper limit for preformed vitamin A (UL)',
  cdrr: 'Reduce intake above',
} as const;

/** Everything behind one nutrient's number: what it does, the NIH target for
 * this person, the upper limit and what it covers, today's data coverage and
 * a link to the source fact sheet. */
export function NutrientSheet({ nutrientKey, onDismiss, profile, amount, fromSupplements, coverage, logCount, estimatedCount = 0 }: Props) {
  const { colors } = useAppTheme();
  const def = nutrientKey ? MICRO_BY_KEY[nutrientKey] : null;
  const target = def ? targetFor(def.key, profile) : null;
  const ul = def ? upperLimitFor(def.key, profile) : null;
  const towardUl = def && ul ? amountTowardLimit(def.key, amount, fromSupplements, profile) : 0;
  const over = !!ul && towardUl > ul.value;
  const noData = logCount > 0 && coverage === 0;

  return (
    <Portal>
      <Modal visible={!!def} onDismiss={onDismiss}
        contentContainerStyle={[styles.sheet, { backgroundColor: colors.surface }]}>
        {def && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={[styles.title, { color: colors.onSurface }]}>{def.label}</Text>

            <View style={styles.statRow}>
              <Stat label="Today" value={noData ? '—' : `${formatAmount(amount)} ${def.unit}`} />
              <Stat label="Your target" value={target != null ? `${formatAmount(target)} ${def.unit}` : 'None set'} />
              {target != null && <Stat label="Progress" value={noData ? '—' : `${Math.round((amount / target) * 100)}%`} />}
            </View>

            <Section title={basisLabel(def.basis)}>
              {target != null
                ? `NIH value for ${profileLabel(profile)}.`
                : 'NIH publishes no daily target for this nutrient, so it isn’t counted in your percentages.'}
              {def.targetNote ? ` ${def.targetNote}` : ''}
            </Section>

            {ul && (
              <View style={[styles.limitBox, { borderColor: over ? colors.error : colors.outline }]}>
                <View style={styles.limitHead}>
                  {over && <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />}
                  <Text variant="titleSmall" style={{ color: over ? colors.error : colors.onSurface, flex: 1 }}>
                    {SCOPE_TITLE[ul.scope]}: {formatAmount(ul.value)} {def.unit}
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{ul.note}</Text>
                {ul.scope !== 'total' && ul.scope !== 'cdrr' && (
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
                    From supplements today: {formatAmount(towardUl)} {def.unit}
                  </Text>
                )}
                {over && (
                  <Text variant="bodySmall" style={{ color: colors.error, marginTop: 4 }}>
                    {ul.scope === 'cdrr'
                      ? 'You’re above this level today.'
                      : 'You’re above the upper limit today. Regularly going over it can cause harm; check with a clinician.'}
                  </Text>
                )}
              </View>
            )}
            {!ul && def.basis !== 'none' && (
              <Section title="Upper limit">NIH has not set an upper limit for this nutrient.</Section>
            )}

            <Section title="What it does">{def.about}</Section>

            <Section title="Your data today">
              {logCount === 0
                ? 'Nothing logged yet today.'
                : coverage === logCount
                  ? (logCount === 1 ? 'The food you logged reports this nutrient.'
                    : logCount === 2 ? 'Both foods you logged report this nutrient.'
                    : `All ${logCount} foods you logged report this nutrient.`)
                  : coverage === 0
                    ? `None of the ${logCount} food${logCount === 1 ? '' : 's'} you logged report this nutrient, so today’s amount is unknown.`
                    : `${coverage} of ${logCount} foods you logged report this nutrient. The rest have no data, so your real intake is probably higher.`}
              {estimatedCount > 0
                ? ` ${estimatedCount === 1 ? 'One food uses' : `${estimatedCount} foods use`} values estimated from a similar reference food, because ${estimatedCount === 1 ? 'its label doesn’t' : 'their labels don’t'} list vitamins or minerals.`
                : ''}
            </Section>

            {def.source && (
              <Button mode="outlined" icon="open-in-new" style={styles.link} textColor={colors.onSurface}
                onPress={() => Linking.openURL(def.source!.url)}>
                {def.source.name.replace(/ Fact Sheet$/, '')}
              </Button>
            )}
            <Text variant="labelSmall" style={[styles.disclaimer, { color: colors.onSurfaceVariant }]}>
              Needs differ in pregnancy, breastfeeding and some health conditions. This is not medical advice.
            </Text>
            <Button mode="contained" onPress={onDismiss} style={styles.done}>Done</Button>
          </ScrollView>
        )}
      </Modal>
    </Portal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surfaceVariant }]}>
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="titleMedium" style={{ color: colors.onSurface }}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>{title.toUpperCase()}</Text>
      <Text variant="bodyMedium" style={{ color: colors.onSurface, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { margin: spacing.md, padding: spacing.lg, borderRadius: shape.lg, maxHeight: '88%' },
  title: { marginBottom: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: { flex: 1, borderRadius: shape.md, padding: spacing.sm, gap: 2 },
  section: { marginBottom: spacing.md, gap: 4 },
  limitBox: { borderWidth: 1, borderRadius: shape.md, padding: spacing.sm, marginBottom: spacing.md },
  limitHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  link: { borderRadius: shape.md, marginBottom: spacing.sm },
  disclaimer: { textAlign: 'center', marginVertical: spacing.sm, lineHeight: 16 },
  done: { borderRadius: shape.md },
});
