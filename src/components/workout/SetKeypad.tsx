import { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Text, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';

export type SetType = 'normal' | 'warmup' | 'failure' | 'drop';

export interface SetEntry {
  weight: number;
  reps: number;
  rpe: number | null;
  setType: SetType;
}

interface SetKeypadProps {
  visible: boolean;
  exerciseName: string;
  initial: { weight: string; reps: string };
  onConfirm: (entry: SetEntry) => void;
  onDismiss: () => void;
}

const SET_TYPES: { key: SetType; label: string }[] = [
  { key: 'normal', label: 'Normal' },
  { key: 'warmup', label: 'Warm-up' },
  { key: 'failure', label: 'Failure' },
  { key: 'drop', label: 'Drop' },
];

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

/** MacroFactor-style fast set entry: an in-app keypad with Weight/Reps fields,
 * set-type chips, optional RIR, and a confirm — no fiddly OS keyboard mid-set. */
export function SetKeypad({ visible, exerciseName, initial, onConfirm, onDismiss }: SetKeypadProps) {
  const { colors } = useAppTheme();
  const [weight, setWeight] = useState(initial.weight);
  const [reps, setReps] = useState(initial.reps);
  const [field, setField] = useState<'weight' | 'reps'>('weight');
  const [rpe, setRpe] = useState<number | null>(null);
  const [setType, setSetType] = useState<SetType>('normal');

  useEffect(() => {
    if (visible) {
      setWeight(initial.weight);
      setReps(initial.reps);
      setField('weight');
      setRpe(null);
      setSetType('normal');
    }
  }, [visible]);

  if (!visible) return null;

  const press = (k: string) => {
    const cur = field === 'weight' ? weight : reps;
    let next = cur;
    if (k === 'del') next = cur.slice(0, -1);
    else if (k === '.') next = cur.includes('.') ? cur : cur + '.';
    else next = cur === '0' ? k : cur + k;
    field === 'weight' ? setWeight(next) : setReps(next);
  };

  const confirm = () => {
    onConfirm({
      weight: parseFloat(weight) || 0,
      reps: parseInt(reps) || 0,
      rpe,
      setType,
    });
  };

  const FieldBox = ({ label, value, which }: { label: string; value: string; which: 'weight' | 'reps' }) => (
    <Pressable
      onPress={() => setField(which)}
      style={[
        styles.fieldBox,
        { backgroundColor: colors.surfaceVariant, borderColor: field === which ? accent : 'transparent' },
      ]}
    >
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '800' }}>{value || '0'}</Text>
    </Pressable>
  );

  return (
    <Portal>
      <Pressable style={styles.backdrop} onPress={onDismiss} />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <Text variant="titleSmall" style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>{exerciseName}</Text>

        <View style={styles.fields}>
          <FieldBox label="Weight (kg)" value={weight} which="weight" />
          <FieldBox label="Reps" value={reps} which="reps" />
        </View>

        <View style={styles.chipRow}>
          {SET_TYPES.map(t => (
            <Pressable key={t.key} onPress={() => setSetType(t.key)}
              style={[styles.chip, { backgroundColor: setType === t.key ? accent : colors.surfaceVariant }]}>
              <Text variant="labelSmall" style={{ color: setType === t.key ? '#06220F' : colors.onSurfaceVariant, fontWeight: '700' }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.chipRow}>
          <Text variant="labelSmall" style={[styles.rpeLabel, { color: colors.onSurfaceVariant }]}>RIR</Text>
          {[0, 1, 2, 3, 4].map(v => (
            <Pressable key={v} onPress={() => setRpe(rpe === v ? null : v)}
              style={[styles.rpeChip, { backgroundColor: rpe === v ? withAlpha(accent, 0.25) : colors.surfaceVariant, borderColor: rpe === v ? accent : 'transparent' }]}>
              <Text variant="labelMedium" style={{ color: colors.onSurface }}>{v}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.keypad}>
          {KEYS.map(k => (
            <Pressable key={k} onPress={() => press(k)} style={[styles.key, { backgroundColor: colors.surfaceVariant }]}>
              {k === 'del'
                ? <MaterialCommunityIcons name="backspace-outline" size={22} color={colors.onSurface} />
                : <Text variant="titleLarge" style={{ color: colors.onSurface }}>{k}</Text>}
            </Pressable>
          ))}
        </View>

        <Pressable onPress={confirm} style={[styles.confirm, { backgroundColor: accent }]}>
          <MaterialCommunityIcons name="check" size={24} color="#06220F" />
          <Text variant="titleMedium" style={styles.confirmText}>Log set</Text>
        </Pressable>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: shape.lg, borderTopRightRadius: shape.lg,
    padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm,
  },
  title: { fontWeight: '700', textAlign: 'center' },
  fields: { flexDirection: 'row', gap: spacing.sm },
  fieldBox: { flex: 1, borderRadius: shape.md, borderWidth: 2, padding: spacing.sm, alignItems: 'center' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: shape.pill },
  rpeLabel: { width: 28 },
  rpeChip: { width: 40, height: 32, borderRadius: shape.sm, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  key: { width: '31%', height: 52, borderRadius: shape.md, justifyContent: 'center', alignItems: 'center' },
  confirm: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, height: 52, borderRadius: shape.pill, marginTop: spacing.xs },
  confirmText: { color: '#06220F', fontWeight: '800' },
});
