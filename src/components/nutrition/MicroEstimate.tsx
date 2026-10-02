import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Switch, Text } from 'react-native-paper';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme';
import type { Food } from '@/types';
import { estimateMicros, needsEstimate, withEstimate, type MicroEstimate } from '@/services/foodSources/estimate';

export interface MicroEstimateState {
  status: 'idle' | 'loading' | 'found' | 'none';
  estimate: MicroEstimate | null;
  /** The user's choice to include the estimate (on by default). */
  include: boolean;
  setInclude: (v: boolean) => void;
  /** `food` with the estimate merged in, when there is one and it's included. */
  apply: (food: Food) => Food;
  /** How many micronutrients the label itself reports. */
  labelCount: number;
}

/** Looks for a similar reference food whenever `food` has little or no
 * vitamin/mineral data (see services/foodSources/estimate.ts). */
export function useMicroEstimate(food: Food | null): MicroEstimateState {
  const [status, setStatus] = useState<MicroEstimateState['status']>('idle');
  const [estimate, setEstimate] = useState<MicroEstimate | null>(null);
  const [include, setInclude] = useState(true);
  // A stable identity, so re-created food objects don't restart the lookup.
  const key = food ? `${food.source}|${food.sourceId}|${food.id}|${food.name}|${food.calories}|${food.servingSize}` : '';

  useEffect(() => {
    setEstimate(null);
    setInclude(true);
    if (!food || !needsEstimate(food)) { setStatus('idle'); return; }
    let live = true;
    setStatus('loading');
    estimateMicros(food)
      .then(est => { if (live) { setEstimate(est); setStatus(est ? 'found' : 'none'); } })
      .catch(() => { if (live) setStatus('none'); });
    return () => { live = false; };
  }, [key]);

  return {
    status, estimate, include, setInclude,
    labelCount: Object.keys(food?.micros || {}).length,
    apply: f => (status === 'found' && include && estimate ? withEstimate(f, estimate) : f),
  };
}

/** One line under a food's nutrition: what the label is missing and where the
 * estimate comes from, with a switch to leave it out. */
export function MicroEstimateNote({ state }: { state: MicroEstimateState }) {
  const { colors } = useAppTheme();
  if (state.status === 'idle') return null;
  const muted = { color: colors.onSurfaceVariant };
  const label = state.labelCount === 0
    ? 'The label lists no vitamins or minerals.'
    : `The label lists only ${state.labelCount} vitamins & minerals.`;

  if (state.status === 'loading') {
    return (
      <View style={styles.row}>
        <ActivityIndicator size={14} color={colors.onSurfaceVariant} />
        <Text variant="bodySmall" style={[styles.text, muted]}>
          {`${label} Looking for a similar food to estimate the rest…`}
        </Text>
      </View>
    );
  }
  if (state.status === 'none' || !state.estimate) {
    return (
      <Text variant="bodySmall" style={[styles.block, muted]}>
        {`${label} No reference food was close enough to estimate the rest.`}
      </Text>
    );
  }
  const n = Object.keys(state.estimate.micros).length;
  return (
    <View style={[styles.row, styles.block]}>
      <Text variant="bodySmall" style={[styles.text, muted]}>
        {state.include
          ? `Estimate ${n} vitamins & minerals the label doesn’t list, from ${state.estimate.from}`
          : 'Won’t estimate vitamins & minerals for this food, now or next time. You can change this in Edit food.'}
      </Text>
      <Switch value={state.include} onValueChange={state.setInclude} color={colors.primary}
        accessibilityLabel="Include estimated vitamins and minerals" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  block: { marginTop: spacing.sm },
  text: { flex: 1, lineHeight: 17 },
});
