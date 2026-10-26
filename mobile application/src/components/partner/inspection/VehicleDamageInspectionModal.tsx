import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Camera, Check, ShieldCheck, Trash2, X } from 'lucide-react-native';

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
  { key: 'frontPhoto', label: 'Front View', iconLabel: 'Bumper & Hood' },
  { key: 'rearPhoto', label: 'Rear View', iconLabel: 'Trunk & Tail' },
  { key: 'leftSidePhoto', label: 'Driver Side', iconLabel: 'Left Doors' },
  { key: 'rightSidePhoto', label: 'Passenger Side', iconLabel: 'Right Doors' },
];

export default function VehicleDamageInspectionModal({
  visible,
  initialData,
  onClose,
  onSave,
}: Props) {
  const [photos, setPhotos] = useState<InspectionData>(initialData ?? {});
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [pickingSlot, setPickingSlot] = useState<SlotKey | null>(null);

  const takePhoto = async (slot: SlotKey) => {
    try {
      setPickingSlot(slot);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera Permission', 'Please allow camera access to take pre-trip damage inspection photos.');
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

  const handleSlotPress = (slot: SlotKey) => {
    Alert.alert(
      'Attach Vehicle Photo',
      'Choose camera to take a fresh photo of existing scratches or choose from gallery.',
      [
        { text: 'Take Photo', onPress: () => void takePhoto(slot) },
        { text: 'From Gallery', onPress: () => void pickFromGallery(slot) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const removePhoto = (slot: SlotKey) => {
    setPhotos(prev => ({ ...prev, [slot]: undefined }));
  };

  const photoCount = SLOTS.filter(s => Boolean(photos[s.key])).length;

  const handleSave = () => {
    onSave({ ...photos, notes: notes.trim() });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.shieldIconWrap}>
                <ShieldCheck size={20} color="#F59E0B" strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.title}>Pre-Trip Damage Inspection</Text>
                <Text style={styles.subtitle}>Protect yourself by recording pre-existing vehicle damage</Text>
              </View>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Info notice */}
            <View style={styles.noticeCard}>
              <Text style={styles.noticeText}>
                Capture clear photos of the customer vehicle before winching or towing. This protects you from false claims.
              </Text>
            </View>

            {/* Photo Grid */}
            <Text style={styles.sectionLabel}>4-Angle Vehicle Photos ({photoCount}/4 recorded)</Text>
            <View style={styles.grid}>
              {SLOTS.map(({ key, label, iconLabel }) => {
                const uri = photos[key];
                const isPicking = pickingSlot === key;

                return (
                  <View key={key} style={styles.gridItem}>
                    {uri ? (
                      <View style={styles.photoContainer}>
                        <Image source={{ uri }} style={styles.photoPreview} />
                        <View style={styles.slotBadge}>
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                          <Text style={styles.slotBadgeText}>{label}</Text>
                        </View>
                        <Pressable
                          style={styles.deletePhotoBtn}
                          hitSlop={8}
                          onPress={() => removePhoto(key)}>
                          <Trash2 size={14} color="#EF4444" />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.placeholderSlot, pressed && styles.slotPressed]}
                        onPress={() => handleSlotPress(key)}>
                        {isPicking ? (
                          <ActivityIndicator size="small" color="#F59E0B" />
                        ) : (
                          <>
                            <View style={styles.cameraIconWrap}>
                              <Camera size={22} color="#475569" strokeWidth={2} />
                            </View>
                            <Text style={styles.slotLabel}>{label}</Text>
                            <Text style={styles.slotSubLabel}>{iconLabel}</Text>
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Damage notes input */}
            <Text style={styles.sectionLabel}>Damage Notes / Scratches (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Dent on front bumper, broken right headlight, minor door scratches"
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Footer action buttons */}
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.saveBtnPressed,
              ]}
              onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {photoCount > 0 ? `Attach Inspection (${photoCount} Photos)` : 'Save & Continue'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingVertical: 16,
  },
  noticeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  noticeText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 10,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gridItem: {
    width: '48%',
    aspectRatio: 1.3,
  },
  placeholderSlot: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  slotPressed: {
    backgroundColor: '#273549',
    borderColor: '#F59E0B',
  },
  cameraIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  slotLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  slotSubLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  photoContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  slotBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slotBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    fontSize: 13,
    padding: 12,
    minHeight: 70,
    marginBottom: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  saveBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: {
    backgroundColor: '#D97706',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
