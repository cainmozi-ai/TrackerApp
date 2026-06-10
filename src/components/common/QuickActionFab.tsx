import { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { FAB, Portal, Text, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape } from '@/theme';

export interface QuickAction {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

interface QuickActionFabProps {
  actions: QuickAction[];
  color?: string;
}

/** Speed-dial FAB that avoids the nested-<button> hydration error from Paper's
 * FAB.Group on web: the main FAB is a single button; the action menu lives in a
 * Portal as sibling elements. Dark-mode aware, with spring entrance. */
export function QuickActionFab({ actions, color }: QuickActionFabProps) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const fabColor = color ?? colors.primary;

  const handlePress = (action: QuickAction) => {
    setOpen(false);
    action.onPress();
  };

  return (
    <>
      {open && (
        <Portal>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.actionsWrap} pointerEvents="box-none">
            {actions.map((action, i) => (
              <Animated.View key={action.label} entering={FadeInDown.delay(i * 40).springify().damping(16)}>
                <TouchableRipple onPress={() => handlePress(action)} style={styles.actionTouchable} borderless>
                  <View style={styles.actionRow}>
                    <View style={[styles.labelChip, { backgroundColor: colors.surface }]}>
                      <Text variant="labelLarge" style={{ color: colors.onSurface }}>{action.label}</Text>
                    </View>
                    <View style={[styles.miniFab, { backgroundColor: action.color }]}>
                      <MaterialCommunityIcons name={action.icon} size={22} color="#fff" />
                    </View>
                  </View>
                </TouchableRipple>
              </Animated.View>
            ))}
          </View>
        </Portal>
      )}
      <FAB
        icon={open ? 'close' : 'plus'}
        color="#fff"
        style={[styles.fab, { backgroundColor: fabColor }]}
        onPress={() => setOpen(o => !o)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  actionsWrap: { position: 'absolute', right: spacing.md, bottom: 96, alignItems: 'flex-end', gap: spacing.sm },
  actionTouchable: { borderRadius: shape.pill },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  labelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: shape.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  miniFab: {
    width: 48,
    height: 48,
    borderRadius: shape.pill,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fab: { position: 'absolute', right: 16, bottom: 24, borderRadius: shape.pill },
});
