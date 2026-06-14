import { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Text, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, withAlpha } from '@/theme';
import { type LogType, digitsToTime, digitsToSeconds, digitsSecondsOverflow, secondsToDigits } from '@/utils/workout';

export type SetType = 'normal' | 'warmup' | 'failure' | 'drop';

export interface SetEntry {
  weight: number;
  reps: number;
  durationSeconds: number;
  distance: number;
  rpe: number | null;
  setType: SetType;
}

interface SetKeypadProps {
  visible: boolean;
  exerciseName: string;
  logType?: LogType;
  initial: { weight?: string; reps?: string; durationSeconds?: number; distance?: string; rpe?: number | null; setType?: SetType };
  weightUnit?: string;
  confirmLabel?: string;
  onConfirm: (entry: SetEntry) => void;
  onDismiss: () => void;
}

const MAX_REPS = 100;
const MAX_WEIGHT = 999;
const MAX_DISTANCE = 999;

type FieldKey = 'weight' | 'reps' | 'added' | 'distance' | 'time';

const FIELDS_FOR: Record<LogType, FieldKey[]> = {
  weight_reps: ['weight', 'reps'],
  bodyweight: ['reps', 'added'],
  duration: ['time'],
  cardio: ['distance', 'time'],
};

const SET_TYPES: { key: SetType; label: string }[] = [
  { key: 'normal', label: 'Normal' },
  { key: 'warmup', label: 'Warm-up' },
  { key: 'failure', label: 'Failure' },
  { key: 'drop', label: 'Drop' },
];

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

/** Fast in-app set entry. Fields adapt to the exercise's log type:
 * weight×reps, bodyweight reps, a duration (mm:ss), or cardio distance+time. */
export function SetKeypad({ visible, exerciseName, logType = 'weight_reps', initial, weightUnit = 'kg', confirmLabel = 'Log set', onConfirm, onDismiss }: SetKeypadProps) {
  const { colors } = useAppTheme();
  const fields = FIELDS_FOR[logType];
  const [weight, setWeight] = useState(initial.weight ?? '');
  const [reps, setReps] = useState(initial.reps ?? '');
  const [distance, setDistance] = useState(initial.distance ?? '');
  const [timeDigits, setTimeDigits] = useState(secondsToDigits(initial.durationSeconds ?? 0));
  const [field, setField] = useState<FieldKey>(fields[0]);
  // Prefilled values are suggestions: the first digit typed into an untouched
  // field replaces it instead of appending (so "12" + tap 8 gives "8", not "128").
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [rpe, setRpe] = useState<number | null>(null);
  const [setType, setSetType] = useState<SetType>('normal');

  const showSetTypes = logType === 'weight_reps' || logType === 'bodyweight';
  const showRir = showSetTypes;

  useEffect(() => {
    if (visible) {
      setWeight(initial.weight ?? '');
      setReps(initial.reps ?? '');
      setDistance(initial.distance ?? '');
      setTimeDigits(secondsToDigits(initial.durationSeconds ?? 0));
      setField(FIELDS_FOR[logType][0]);
      setTouched({});
      setRpe(initial.rpe ?? null);
      setSetType(initial.setType ?? 'normal');
    }
  }, [visible, initial.weight, initial.reps, initial.distance, initial.durationSeconds, logType]);

  if (!visible) return null;

  const stateKey = (f: FieldKey) => (f === 'added' ? 'weight' : f);
  const valueFor = (f: FieldKey): string => {
    if (f === 'time') return digitsToTime(timeDigits);
    if (f === 'distance') return distance;
    if (f === 'reps') return reps;
    return weight; // weight + added
  };
  const labelFor = (f: FieldKey): string => {
    switch (f) {
      case 'weight': return `Weight (${weightUnit})`;
      case 'added': return `+ Added (${weightUnit})`;
      case 'reps': return 'Reps';
      case 'distance': return 'Distance (km)';
      case 'time': return 'Time';
    }
  };

  const press = (k: string) => {
    if (field === 'time') {
      if (k === 'del') setTimeDigits(t => t.slice(0, -1));
      else if (k !== '.') setTimeDigits(t => (t + k).replace(/^0+/, '').slice(-4));
      return;
    }
    const key = stateKey(field);
    const isReps = field === 'reps';
    const cur = field === 'distance' ? distance : isReps ? reps : weight;
    const setVal = field === 'distance' ? setDistance : isReps ? setReps : setWeight;
    const fresh = !touched[key];
    const base = fresh && k !== 'del' ? '' : cur;
    let next = base;
    if (k === 'del') next = cur.slice(0, -1);
    else if (k === '.') { if (isReps) return; next = base.includes('.') ? base : (base || '0') + '.'; }
    else next = base === '0' ? k : base + k;
    if (!touched[key]) setTouched(t => ({ ...t, [key]: true }));
    setVal(next);
  };

  const parsedWeight = parseFloat(weight) || 0;
  const parsedReps = parseInt(reps, 10) || 0;
  const parsedDistance = parseFloat(distance) || 0;
  const durationSeconds = digitsToSeconds(timeDigits);
  const secOverflow = digitsSecondsOverflow(timeDigits);

  let valid = true;
  let errorMsg = '';
  if (logType === 'duration') {
    if (secOverflow) { valid = false; errorMsg = 'Seconds must be under 60'; }
    else if (durationSeconds < 1) valid = false;
  } else if (logType === 'cardio') {
    if (secOverflow) { valid = false; errorMsg = 'Seconds must be under 60'; }
    else if (durationSeconds < 1 && parsedDistance <= 0) valid = false;
    else if (parsedDistance > MAX_DISTANCE) { valid = false; errorMsg = `Distance capped at ${MAX_DISTANCE} km`; }
  } else {
    if (parsedReps < 1 || parsedReps > MAX_REPS) { valid = false; if (parsedReps > MAX_REPS) errorMsg = `Reps capped at ${MAX_REPS}`; }
    if (parsedWeight > MAX_WEIGHT) { valid = false; errorMsg = `Weight capped at ${MAX_WEIGHT} ${weightUnit}`; }
  }

  const confirm = () => {
    if (!valid) return;
    onConfirm({ weight: parsedWeight, reps: parsedReps, durationSeconds, distance: parsedDistance, rpe, setType });
  };

  const decimalDisabled = field === 'time' || field === 'reps';

  return (
    <Portal>
      <Pressable style={styles.backdrop} onPress={onDismiss} />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <Text variant="titleSmall" style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>{exerciseName}</Text>

        <View style={styles.fields}>
          {fields.map(f => (
            <FieldBox key={f} label={labelFor(f)} value={valueFor(f)} active={field === f} onPress={() => setField(f)} />
          ))}
        </View>

        {!!errorMsg && (
          <Text variant="labelSmall" style={{ color: colors.error, textAlign: 'center' }}>{errorMsg}</Text>
        )}

        {showSetTypes && (
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
        )}

        {showRir && (
          <View style={styles.chipRow}>
            <Text variant="labelSmall" style={[styles.rpeLabel, { color: colors.onSurfaceVariant }]}>RIR</Text>
            {[0, 1, 2, 3, 4].map(v => (
              <Pressable key={v} onPress={() => setRpe(rpe === v ? null : v)}
                style={[styles.rpeChip, { backgroundColor: rpe === v ? withAlpha(accent, 0.25) : colors.surfaceVariant, borderColor: rpe === v ? accent : 'transparent' }]}>
                <Text variant="labelMedium" style={{ color: colors.onSurface }}>{v}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.keypad}>
          {KEYS.map(k => {
            const dim = k === '.' && decimalDisabled;
            return (
              <Pressable key={k} onPress={() => press(k)} disabled={dim}
                style={[styles.key, { backgroundColor: colors.surfaceVariant, opacity: dim ? 0.3 : 1 }]}>
                {k === 'del'
                  ? <MaterialCommunityIcons name="backspace-outline" size={22} color={colors.onSurface} />
                  : <Text variant="titleLarge" style={{ color: colors.onSurface }}>{k}</Text>}
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={confirm} disabled={!valid}
          style={[styles.confirm, { backgroundColor: accent, opacity: valid ? 1 : 0.4 }]}>
          <MaterialCommunityIcons name="check" size={24} color="#06220F" />
          <Text variant="titleMedium" style={styles.confirmText}>{confirmLabel}</Text>
        </Pressable>
      </View>
    </Portal>
  );
}

// Defined at module level (not inside SetKeypad) so the Pressable isn't
// remounted on every keystroke — remounting drops in-flight taps.
function FieldBox({ label, value, active, onPress }: { label: string; value: string; active: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.fieldBox,
        { backgroundColor: colors.surfaceVariant, borderColor: active ? accent : 'transparent' },
      ]}
    >
      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '800' }}>{value || '0'}</Text>
    </Pressable>
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
