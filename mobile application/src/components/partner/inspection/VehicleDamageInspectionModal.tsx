import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Check,
  ImageIcon,
  Info,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react-native';

import {
  driverColors as C,
  driverRadius as R,
  driverShadow,
  driverType as T,
  getPressableFeedback,
  motionTokens,
} from '../../../theme/driverUi';

export interface InspectionData {
  frontPhoto?: string;
  rearPhoto?: string;
  leftSidePhoto?: string;
  rightSidePhoto?: string;
  notes?: string;
}

interface Props {
  visible: boolean;
  initialData?: InspectionData;
  onClose: () => void;
  onSave: (data: InspectionData) => void;
}

type SlotKey = 'frontPhoto' | 'rearPhoto' | 'leftSidePhoto' | 'rightSidePhoto';

const SLOTS: Array<{ key: SlotKey; label: string; iconLabel: string }> = [
  { key: 'frontPhoto', label: 'Front View', iconLabel: 'Bumper & hood' },
  { key: 'rearPhoto', label: 'Rear View', iconLabel: 'Trunk & tail' },
  { key: 'leftSidePhoto', label: 'Driver Side', iconLabel: 'Left doors' },
  { key: 'rightSidePhoto', label: 'Passenger Side', iconLabel: 'Right doors' },
];

function PhotoSlotCard({
  label,
  iconLabel,
  uri,
  isPicking,
  onPress,
  onRemove,
}: {
  label: string;
  iconLabel: string;
  uri?: string;
  isPicking: boolean;
  onPress: () => void;
  onRemove: () => void;
}) {
  const appear = useRef(new Animated.Value(uri ? 1 : 0)).current;

  useEffect(() => {
    if (uri) {
      appear.setValue(0);
      Animated.timing(appear, {
        toValue: 1,
        duration: motionTokens.duration.contentTransition,
        easing: motionTokens.easing.decelerate,
        useNativeDriver: true,
      }).start();
    }
  }, [appear, uri]);

  if (uri) {
    return (
      <Animated.View
        style={[
          styles.gridItemInner,
          {
            opacity: appear,
            transform: [
              {
                scale: appear.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.photoContainer}>
          <Image source={{ uri }} style={styles.photoPreview} />
          <View style={styles.slotBadge}>
            <Check size={11} color={C.white} strokeWidth={3} />
            <Text style={styles.slotBadgeText}>{label}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.deletePhotoBtn,
              getPressableFeedback(pressed, { scale: 0.92 }),
            ]}
            hitSlop={8}
            accessibilityLabel={`Remove ${label} photo`}
            onPress={onRemove}>
            <Trash2 size={14} color={C.red} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            style={styles.retakeOverlay}
            onPress={onPress}
            accessibilityLabel={`Retake ${label} photo`}>
            <Camera size={14} color={C.white} strokeWidth={2.2} />
            <Text style={styles.retakeText}>Retake</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.placeholderSlot,
        styles.gridItemInner,
        getPressableFeedback(pressed),
      ]}
      onPress={onPress}
      accessibilityLabel={`Add ${label} photo`}>
      {isPicking ? (
        <ActivityIndicator size="small" color={C.amberText} />
      ) : (
        <>
          <View style={styles.cameraIconWrap}>
            <Camera size={20} color={C.amberText} strokeWidth={2.2} />
          </View>
          <Text style={styles.slotLabel}>{label}</Text>
          <Text style={styles.slotSubLabel}>{iconLabel}</Text>
        </>
      )}
    </Pressable>
  );
}

function InspectionPhotoSourceSheet({
  visible,
  slotLabel,
  onTakePhoto,
  onFromGallery,
  onCancel,
}: {
  visible: boolean;
  slotLabel: string;
  onTakePhoto: () => void;
  onFromGallery: () => void;
  onCancel: () => void;
}) {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slide.setValue(0);
      Animated.timing(slide, {
        toValue: 1,
        duration: motionTokens.duration.sheetTransition,
        easing: motionTokens.easing.decelerate,
        useNativeDriver: true,
      }).start();
    }
  }, [slide, visible]);

  if (!visible) return null;

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [280, 0],
  });

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={styles.sourceOverlay} onPress={onCancel} accessibilityLabel="Close">
        <Animated.View style={[styles.sourceSheet, { transform: [{ translateY }] }]}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={styles.grabber} />
            <Text style={styles.sourceTitle}>Attach vehicle photo</Text>
            <Text style={styles.sourceMessage}>
              Add a clear {slotLabel.toLowerCase()} shot of existing scratches or damage.
            </Text>

            <Pressable
              style={({ pressed }) => [styles.sourceOption, getPressableFeedback(pressed)]}
              onPress={onTakePhoto}>
              <View style={styles.sourceIconWrap}>
                <Camera size={18} color={C.amberText} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sourceOptionLabel}>Take photo</Text>
                <Text style={styles.sourceOptionHint}>Opens camera with crop</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.sourceOption, getPressableFeedback(pressed)]}
              onPress={onFromGallery}>
              <View style={styles.sourceIconWrap}>
                <ImageIcon size={18} color={C.amberText} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sourceOptionLabel}>Choose from gallery</Text>
                <Text style={styles.sourceOptionHint}>Pick an existing image</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.sourceCancel, getPressableFeedback(pressed)]}
              onPress={onCancel}>
              <Text style={styles.sourceCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function CameraPermissionDialog({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.permissionBackdrop}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            Allow camera permission in settings so you can capture pre-trip damage photos on site.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.permissionBtn, getPressableFeedback(pressed)]}
            onPress={onDismiss}>
            <Text style={styles.permissionBtnText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function VehicleDamageInspectionModal({
  visible,
  initialData,
  onClose,
  onSave,
}: Props) {
  const [photos, setPhotos] = useState<InspectionData>(initialData ?? {});
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [pickingSlot, setPickingSlot] = useState<SlotKey | null>(null);
  const [sourceSheet, setSourceSheet] = useState<{ slot: SlotKey; label: string } | null>(null);
  const [showCameraDenied, setShowCameraDenied] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslate = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setPhotos(initialData ?? {});
      setNotes(initialData?.notes ?? '');
    }
  }, [initialData, visible]);

  useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      sheetTranslate.setValue(400);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: motionTokens.duration.sheetTransition,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslate, {
          toValue: 0,
          duration: motionTokens.duration.sheetTransition,
          easing: motionTokens.easing.decelerate,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [backdropOpacity, sheetTranslate, visible]);

  const closeWithAnimation = useCallback(
    (after?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: motionTokens.duration.microTransition,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslate, {
          toValue: 400,
          duration: motionTokens.duration.microTransition,
          useNativeDriver: true,
        }),
      ]).start(() => {
        after?.();
        onClose();
      });
    },
    [backdropOpacity, onClose, sheetTranslate],
  );

  const takePhoto = async (slot: SlotKey) => {
    setSourceSheet(null);
    try {
      setPickingSlot(slot);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setShowCameraDenied(true);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotos(prev => ({ ...prev, [slot]: result.assets[0].uri }));
      }
    } catch (e) {
      console.warn('Camera error', e);
    } finally {
      setPickingSlot(null);
    }
  };

  const pickFromGallery = async (slot: SlotKey) => {
    setSourceSheet(null);
    try {
      setPickingSlot(slot);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotos(prev => ({ ...prev, [slot]: result.assets[0].uri }));
      }
    } catch (e) {
      console.warn('Gallery picker error', e);
    } finally {
      setPickingSlot(null);
    }
  };

  const handleSlotPress = (slot: SlotKey, label: string) => {
    setSourceSheet({ slot, label });
  };

  const removePhoto = (slot: SlotKey) => {
    setPhotos(prev => ({ ...prev, [slot]: undefined }));
  };

  const photoCount = SLOTS.filter(s => Boolean(photos[s.key])).length;
  const progress = photoCount / SLOTS.length;

  const handleSave = () => {
    onSave({ ...photos, notes: notes.trim() });
    closeWithAnimation();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => closeWithAnimation()}>
      <View style={styles.backdropRoot}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeWithAnimation()} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetContainer,
            driverShadow,
            { transform: [{ translateY: sheetTranslate }] },
          ]}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.shieldIconWrap}>
                <ShieldCheck size={20} color={C.amberText} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title}>Pre-Trip Damage Inspection</Text>
                <Text style={styles.subtitle}>
                  Record pre-existing damage before winching or towing
                </Text>
              </View>
            </View>
            <Pressable
              hitSlop={12}
              onPress={() => closeWithAnimation()}
              style={({ pressed }) => [styles.closeBtn, getPressableFeedback(pressed)]}>
              <X size={18} color={C.grey} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.noticeCard}>
              <View style={styles.noticeIconWrap}>
                <Info size={16} color={C.blue} strokeWidth={2.2} />
              </View>
              <Text style={styles.noticeText}>
                Capture clear photos of the customer vehicle before you start. This protects you
                from false damage claims later.
              </Text>
            </View>

            <View style={styles.progressHeader}>
              <Text style={styles.sectionLabel}>4-angle vehicle photos</Text>
              <Text style={styles.progressCount}>
                {photoCount}/{SLOTS.length}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            <View style={styles.grid}>
              {SLOTS.map(({ key, label, iconLabel }) => (
                <View key={key} style={styles.gridItem}>
                  <PhotoSlotCard
                    label={label}
                    iconLabel={iconLabel}
                    uri={photos[key]}
                    isPicking={pickingSlot === key}
                    onPress={() => handleSlotPress(key, label)}
                    onRemove={() => removePhoto(key)}
                  />
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Damage notes / scratches (optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Dent on front bumper, broken right headlight, minor door scratches"
              placeholderTextColor={C.greySoft}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                getPressableFeedback(pressed, { scale: motionTokens.scale.pressed }),
              ]}
              onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {photoCount > 0
                  ? `Save inspection · ${photoCount} photo${photoCount === 1 ? '' : 's'}`
                  : 'Save & continue'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>

      <InspectionPhotoSourceSheet
        visible={Boolean(sourceSheet)}
        slotLabel={sourceSheet?.label ?? 'vehicle'}
        onTakePhoto={() => sourceSheet && void takePhoto(sourceSheet.slot)}
        onFromGallery={() => sourceSheet && void pickFromGallery(sourceSheet.slot)}
        onCancel={() => setSourceSheet(null)}
      />

      <CameraPermissionDialog visible={showCameraDenied} onDismiss={() => setShowCameraDenied(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContainer: {
    backgroundColor: C.pageBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: C.hairline,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.hairline,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  shieldIconWrap: {
    width: 40,
    height: 40,
    borderRadius: R.tileSm,
    backgroundColor: C.amberTileSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...T.cardTitle,
    color: C.ink,
  },
  subtitle: {
    ...T.cardSubtitle,
    color: C.grey,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: R.tileSm,
    backgroundColor: C.light,
  },
  body: {
    paddingHorizontal: 18,
  },
  bodyContent: {
    paddingVertical: 16,
    paddingBottom: 8,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.bluePill,
    borderRadius: R.innerCard,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  noticeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    ...T.body,
    color: C.inkSoft,
    flex: 1,
    lineHeight: 19,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    ...T.small,
    fontWeight: '600',
    color: C.ink,
    textTransform: 'capitalize',
  },
  progressCount: {
    ...T.small,
    color: C.grey,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.light,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: C.green,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
    maxWidth: '48%',
    aspectRatio: 1.25,
  },
  gridItemInner: {
    flex: 1,
  },
  placeholderSlot: {
    flex: 1,
    backgroundColor: C.light,
    borderRadius: R.innerCard,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  cameraIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.amberTileSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  slotLabel: {
    ...T.small,
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },
  slotSubLabel: {
    fontSize: 10,
    color: C.greySoft,
    marginTop: 2,
    textAlign: 'center',
  },
  photoContainer: {
    flex: 1,
    borderRadius: R.innerCard,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: C.greenCardBorder,
    backgroundColor: C.greenCard,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  slotBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: R.tileSm,
  },
  slotBadgeText: {
    fontSize: 10,
    color: C.white,
    fontWeight: '600',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.redPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: R.tileSm,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  retakeText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.white,
  },
  notesInput: {
    backgroundColor: C.light,
    borderRadius: R.innerCard,
    borderWidth: 1,
    borderColor: C.hairline,
    color: C.ink,
    ...T.body,
    padding: 14,
    minHeight: 88,
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    backgroundColor: C.pageBg,
  },
  saveBtn: {
    backgroundColor: C.amber,
    borderRadius: R.button,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...T.button,
    color: C.ink,
  },
  sourceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sourceSheet: {
    backgroundColor: C.pageBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.hairline,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sourceTitle: {
    ...T.cardTitle,
    color: C.ink,
    marginBottom: 4,
  },
  sourceMessage: {
    ...T.cardSubtitle,
    color: C.grey,
    marginBottom: 16,
  },
  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: R.innerCard,
    backgroundColor: C.light,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  sourceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: R.tileSm,
    backgroundColor: C.amberTileSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceOptionLabel: {
    ...T.cardTitle,
    fontSize: 15,
    color: C.ink,
  },
  sourceOptionHint: {
    ...T.small,
    color: C.greySoft,
    marginTop: 2,
  },
  sourceCancel: {
    marginTop: 6,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: R.button,
    backgroundColor: C.light,
  },
  sourceCancelText: {
    ...T.button,
    fontSize: 15,
    color: C.grey,
  },
  permissionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: C.pageBg,
    borderRadius: R.card,
    padding: 22,
    borderWidth: 1,
    borderColor: C.hairline,
    ...driverShadow,
  },
  permissionTitle: {
    ...T.sectionTitle,
    fontSize: 18,
    color: C.ink,
    marginBottom: 8,
  },
  permissionBody: {
    ...T.body,
    color: C.grey,
    marginBottom: 18,
  },
  permissionBtn: {
    backgroundColor: C.amber,
    borderRadius: R.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  permissionBtnText: {
    ...T.button,
    color: C.ink,
  },
});
