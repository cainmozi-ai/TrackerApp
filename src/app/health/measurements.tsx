import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Image, Platform, Pressable, useWindowDimensions } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Snackbar, IconButton, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { spacing, shape, accent, moduleColors, withAlpha } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useMeasurementStore, MEASUREMENT_FIELDS, type MeasurementField, type ProgressPhoto } from '@/stores/measurementStore';
import { useUserStore } from '@/stores/userStore';

const FIELD_LABELS: Record<MeasurementField, string> = {
  neck: 'Neck', shoulders: 'Shoulders', chest: 'Chest', waist: 'Waist',
  hips: 'Hips', bicep: 'Bicep', thigh: 'Thigh', calf: 'Calf',
};

/** Copy a picked image into permanent app storage so the cache cleanup can't eat it. */
async function persistPhoto(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const dest = `${FileSystem.documentDirectory}progress-photos/`;
  await FileSystem.makeDirectoryAsync(dest, { intermediates: true }).catch(() => {});
  const target = `${dest}${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}

export default function MeasurementsScreen() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { history, photos, loadHistory, logMeasurement, deleteMeasurement, loadPhotos, addPhoto, deletePhoto } = useMeasurementStore();
  const { profile, loadProfile } = useUserStore();
  const [tab, setTab] = useState<'measure' | 'photos'>('measure');
  const [inputs, setInputs] = useState<Partial<Record<MeasurementField, string>>>({});
  const [snack, setSnack] = useState('');
  const [viewPhoto, setViewPhoto] = useState<ProgressPhoto | null>(null);

  const unit = profile?.weightUnit === 'lbs' ? 'in' : 'cm';
  const photoSize = (width - spacing.md * 2 - spacing.sm * 2) / 3;

  useEffect(() => {
    loadHistory();
    loadPhotos();
    loadProfile();
  }, []);

  const latest = history[0];
  const previousFor = (field: MeasurementField, skipId: number): number | undefined =>
    history.find(h => h.id !== skipId && h.values[field] != null)?.values[field];

  const handleSave = async () => {
    const values: Partial<Record<MeasurementField, number>> = {};
    for (const f of MEASUREMENT_FIELDS) {
      const v = parseFloat(inputs[f] || '');
      if (v > 0) values[f] = v;
    }
    if (Object.keys(values).length === 0) return;
    await logMeasurement(values);
    setInputs({});
    setSnack('Measurements saved');
  };

  const pickPhoto = async (camera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.8 };
    const result = camera
      ? await (async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return null;
          return ImagePicker.launchCameraAsync(opts);
        })()
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (!result || result.canceled || !result.assets?.[0]) return;
    const stored = await persistPhoto(result.assets[0].uri);
    await addPhoto(stored);
    setSnack('Progress photo added');
  };

  const anyInput = MEASUREMENT_FIELDS.some(f => parseFloat(inputs[f] || '') > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Body Tracker" />

      <SegmentedButtons
        value={tab}
        onValueChange={v => setTab(v as typeof tab)}
        buttons={[
          { value: 'measure', label: 'Measurements', icon: 'tape-measure' },
          { value: 'photos', label: 'Photos', icon: 'camera' },
        ]}
        style={styles.tabs}
      />

      {tab === 'measure' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Log today ({unit})
          </Text>
          <View style={styles.inputGrid}>
            {MEASUREMENT_FIELDS.map(f => (
              <TextInput
                key={f}
                label={`${FIELD_LABELS[f]} (${unit})`}
                value={inputs[f] || ''}
                onChangeText={t => setInputs(prev => ({ ...prev, [f]: t }))}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                placeholder={latest?.values[f] != null ? String(latest.values[f]) : undefined}
              />
            ))}
          </View>
          <Button mode="contained" buttonColor={accent} onPress={handleSave} disabled={!anyInput} style={styles.saveBtn}>
            Save Measurements
          </Button>

          <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>History</Text>
          {history.length === 0 ? (
            <EmptyState icon="tape-measure" color={accent} title="No measurements yet"
              body="Log your first set above. Fill only the parts you measure — every field is optional." />
          ) : (
            history.map(entry => (
              <View key={entry.id} style={[styles.histCard, { backgroundColor: colors.surface }]}>
                <View style={styles.histHead}>
                  <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700', flex: 1 }}>
                    {entry.logDate}
                  </Text>
                  <IconButton icon="close" size={16} onPress={() => deleteMeasurement(entry.id)} style={styles.histDelete} />
                </View>
                <View style={styles.histGrid}>
                  {MEASUREMENT_FIELDS.filter(f => entry.values[f] != null).map(f => {
                    const prev = previousFor(f, entry.id);
                    const delta = prev != null ? Math.round((entry.values[f]! - prev) * 10) / 10 : null;
                    return (
                      <View key={f} style={styles.histItem}>
                        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{FIELD_LABELS[f]}</Text>
                        <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
                          {entry.values[f]} {unit}
                          {delta != null && delta !== 0 && (
                            <Text variant="labelSmall" style={{ color: delta < 0 ? '#A83232' : accent }}>
                              {'  '}{delta > 0 ? '+' : ''}{delta}
                            </Text>
                          )}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.photoBtns}>
            <Button mode="contained" icon="camera" buttonColor={accent} style={styles.photoBtn} onPress={() => pickPhoto(true)}>
              Take Photo
            </Button>
            <Button mode="contained-tonal" icon="image" style={styles.photoBtn} onPress={() => pickPhoto(false)}>
              From Gallery
            </Button>
          </View>

          {photos.length === 0 ? (
            <EmptyState icon="camera-outline" color={accent} title="No progress photos yet"
              body="Same pose, same lighting, every few weeks — future you will thank you." />
          ) : (
            <View style={styles.photoGrid}>
              {photos.map(p => (
                <Pressable key={p.id} onPress={() => setViewPhoto(p)}>
                  <Image source={{ uri: p.uri }} style={[styles.photo, { width: photoSize, height: photoSize * 1.25 }]} />
                  <View style={[styles.photoDate, { backgroundColor: withAlpha('#000', 0.55) }]}>
                    <Text variant="labelSmall" style={{ color: '#fff' }}>{p.logDate.slice(5)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={!!viewPhoto} onDismiss={() => setViewPhoto(null)}>
          <Dialog.Title>{viewPhoto?.logDate}</Dialog.Title>
          <Dialog.Content>
            {viewPhoto && <Image source={{ uri: viewPhoto.uri }} style={styles.fullPhoto} resizeMode="contain" />}
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.error} onPress={async () => { if (viewPhoto) { await deletePhoto(viewPhoto.id); setViewPhoto(null); } }}>
              Delete
            </Button>
            <Button onPress={() => setViewPhoto(null)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={2000}>{snack}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  scrollContent: { padding: spacing.md, paddingTop: 0, paddingBottom: 40 },
  sectionTitle: { fontWeight: '700', marginTop: spacing.sm, marginBottom: spacing.sm },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: { width: '47.5%' },
  saveBtn: { marginTop: spacing.md, borderRadius: shape.pill },
  histCard: { padding: spacing.md, borderRadius: shape.md, marginBottom: spacing.sm },
  histHead: { flexDirection: 'row', alignItems: 'center' },
  histDelete: { margin: 0 },
  histGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 4 },
  histItem: { minWidth: 70 },
  photoBtns: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  photoBtn: { flex: 1 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { borderRadius: shape.md, backgroundColor: '#222' },
  photoDate: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  fullPhoto: { width: '100%', height: 380, borderRadius: shape.md },
});
