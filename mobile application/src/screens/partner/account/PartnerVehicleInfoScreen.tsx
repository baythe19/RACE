import { PartnerText, PartnerTextInput } from '../../../components/partner/PartnerText';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  ChevronDown,
  CheckCircle,
  Truck,
  ShieldCheck,
  Hash,
  X,
  Car,
} from 'lucide-react-native';

import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import PartnerSuccessDialog from '../../../components/partner/dialogs/PartnerSuccessDialog';
import PartnerUploadSheet from '../../../components/partner/dialogs/PartnerUploadSheet';
import PartnerPermissionDialog, { type PermissionType } from '../../../components/partner/dialogs/PartnerPermissionDialog';
import { images } from '../../../assets';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerVehicleInfo'>;

const VEHICLE_TYPES = [
  'Flatbed Tow Truck',
  'Wheel-Lift Tow Truck',
  'Heavy Duty Commercial Tow',
  'Integrated Recovery Truck',
  'Roadside Service Van',
];

const VEHICLE_MODELS = [
  'Tata 407 Gold',
  'Ashok Leyland Dost',
  'Mahindra Bolero Maxi Truck',
  'Eicher Pro 2049',
  'Tata Ultra T.7',
  'Force Traveller Recovery',
  'Other / Custom Model',
];

const INSURANCE_PROVIDERS = [
  'ICICI Lombard General Insurance',
  'Tata AIG General Insurance',
  'HDFC ERGO General Insurance',
  'Bajaj Allianz General Insurance',
  'New India Assurance',
  'Digit Insurance',
  'Reliance General Insurance',
  'Other Provider',
];

interface OptionPickerModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (opt: string) => void;
  onClose: () => void;
}

function OptionPickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: OptionPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <View style={styles.pickerHandle} />
            <View style={styles.sheetTitleRow}>
              <PartnerText style={styles.pickerTitle}>{title}</PartnerText>
              <Pressable hitSlop={8} onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={driverColors.grey} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {options.map(opt => {
              const isSel = opt === selected || selected.includes(opt);
              return (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [
                    styles.pickerOptionRow,
                    isSel && styles.pickerOptionSelected,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    onSelect(opt);
                    onClose();
                  }}>
                  <PartnerText style={[styles.pickerOptionText, isSel && styles.pickerOptionTextSelected]}>
                    {opt}
                  </PartnerText>
                  {isSel ? <CheckCircle size={18} color="#059669" strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function PartnerVehicleInfoScreen({ navigation }: Props) {
  const [vehicleType, setVehicleType] = useState('Flatbed Tow Truck');
  const [vehicleNumber, setVehicleNumber] = useState('OD-02-TOW-1001');
  const [rcNumber, setRcNumber] = useState('OD0220210001234');
  const [vehicleModel, setVehicleModel] = useState('Tata 407 Gold');
  const [insuranceProvider, setInsuranceProvider] = useState('ICICI Lombard General Insurance');

  const [vehiclePhotoUri, setVehiclePhotoUri] = useState<string | null>(null);
  const [uploadSheetVisible, setUploadSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [insuranceModalVisible, setInsuranceModalVisible] = useState(false);

  const [permissionModal, setPermissionModal] = useState<{
    visible: boolean;
    type: PermissionType;
    onAllow: () => void;
  }>({
    visible: false,
    type: 'camera',
    onAllow: () => {},
  });

  const triggerCameraLaunch = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (!result.canceled && result.assets[0]?.uri) {
        setVehiclePhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Unable to capture photo.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const status = await ImagePicker.getCameraPermissionsAsync();
      if (!status.granted) {
        setPermissionModal({
          visible: true,
          type: 'camera',
          onAllow: async () => {
            setPermissionModal(prev => ({ ...prev, visible: false }));
            const req = await ImagePicker.requestCameraPermissionsAsync();
            if (req.granted) {
              await triggerCameraLaunch();
            }
          },
        });
        return;
      }
      await triggerCameraLaunch();
    } catch {
      Alert.alert('Error', 'Unable to capture photo.');
    }
  };

  const triggerGalleryLaunch = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setVehiclePhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Unable to select image.');
    }
  };

  const handlePickGallery = async () => {
    try {
      const status = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!status.granted) {
        setPermissionModal({
          visible: true,
          type: 'photos',
          onAllow: async () => {
            setPermissionModal(prev => ({ ...prev, visible: false }));
            const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (req.granted) {
              await triggerGalleryLaunch();
            }
          },
        });
        return;
      }
      await triggerGalleryLaunch();
    } catch {
      Alert.alert('Error', 'Unable to select image.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccessVisible(true);
    }, 600);
  };

  const isWheelLift = vehicleType.toLowerCase().includes('wheel');

  return (
    <PartnerScreenLayout
      title="Vehicle Information"
      onBack={() => navigation.goBack()}
      footer={
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            getPressableFeedback(pressed),
            saving && styles.disabledButton,
          ]}
          disabled={saving}
          onPress={handleSave}>
          {saving ? (
            <ActivityIndicator size="small" color={driverColors.white} />
          ) : (
            <PartnerText style={styles.saveButtonText}>Save Changes</PartnerText>
          )}
        </Pressable>
      }>
      {/* Vehicle Highlight Card */}
      <View style={styles.vehicleCard}>
        <View style={styles.artworkContainer}>
          {vehiclePhotoUri ? (
            <Image source={{ uri: vehiclePhotoUri }} style={styles.uploadedVehiclePhoto} resizeMode="cover" />
          ) : (
            <View style={styles.artworkBadge}>
              <Image
                source={isWheelLift ? images.booking.towingWheelLift : images.booking.towingFlatbed}
                style={styles.vehicleGraphic}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

        <View style={styles.vehicleDetails}>
          <PartnerText style={styles.vehicleTitle}>{vehicleModel}</PartnerText>
          <PartnerText style={styles.vehicleSubtitle}>{vehicleType}</PartnerText>
          <PartnerText style={styles.vehiclePlate}>{vehicleNumber}</PartnerText>

          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <PartnerText style={styles.activeText}>Active Vehicle</PartnerText>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.changePhotoButton,
            getPressableFeedback(pressed),
          ]}
          onPress={() => setUploadSheetVisible(true)}>
          <Camera size={14} color={driverColors.ink} strokeWidth={2.2} />
          <PartnerText style={styles.changePhotoText}>
            {vehiclePhotoUri ? 'Change Photo' : 'Upload Vehicle Photo'}
          </PartnerText>
        </Pressable>
      </View>

      {/* Form Card */}
      <View style={styles.formCard}>
        {/* Vehicle Type (Dropdown & Input) */}
        <View style={styles.inputGroup}>
          <PartnerText style={styles.label}>Vehicle Type</PartnerText>
          <Pressable
            style={styles.inputWithIcon}
            onPress={() => setTypeModalVisible(true)}>
            <Truck size={18} color="#0284C7" strokeWidth={2.2} />
            <PartnerTextInput
              style={styles.inputIconText}
              value={vehicleType}
              onChangeText={setVehicleType}
              placeholder="e.g. Flatbed Tow Truck"
              placeholderTextColor={driverColors.greySoft}
            />
            <Pressable hitSlop={8} onPress={() => setTypeModalVisible(true)}>
              <ChevronDown size={18} color={driverColors.grey} />
            </Pressable>
          </Pressable>
        </View>

        {/* Vehicle Number (Keyboard friendly) */}
        <View style={styles.inputGroup}>
          <PartnerText style={styles.label}>Vehicle Number</PartnerText>
          <View style={styles.inputWithIcon}>
            <Hash size={18} color={driverColors.grey} strokeWidth={2} />
            <PartnerTextInput
              style={styles.inputIconText}
              value={vehicleNumber}
              onChangeText={t => setVehicleNumber(t.toUpperCase())}
              placeholder="OD-02-TOW-1001"
              placeholderTextColor={driverColors.greySoft}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* RC Number (Keyboard friendly) */}
        <View style={styles.inputGroup}>
          <PartnerText style={styles.label}>RC Number</PartnerText>
          <View style={styles.inputWithIcon}>
            <Hash size={18} color={driverColors.grey} strokeWidth={2} />
            <PartnerTextInput
              style={styles.inputIconText}
              value={rcNumber}
              onChangeText={t => setRcNumber(t.toUpperCase())}
              placeholder="Enter RC number"
              placeholderTextColor={driverColors.greySoft}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Vehicle Model (Dropdown & Input) */}
        <View style={styles.inputGroup}>
          <PartnerText style={styles.label}>Vehicle Model</PartnerText>
          <Pressable
            style={styles.inputWithIcon}
            onPress={() => setModelModalVisible(true)}>
            <Car size={18} color="#D97706" strokeWidth={2.2} />
            <PartnerTextInput
              style={styles.inputIconText}
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholder="e.g. Tata 407 Gold"
              placeholderTextColor={driverColors.greySoft}
            />
            <Pressable hitSlop={8} onPress={() => setModelModalVisible(true)}>
              <ChevronDown size={18} color={driverColors.grey} />
            </Pressable>
          </Pressable>
        </View>

        {/* Insurance Provider (Dropdown & Input) */}
        <View style={styles.inputGroup}>
          <PartnerText style={styles.label}>Insurance Provider</PartnerText>
          <Pressable
            style={styles.inputWithIcon}
            onPress={() => setInsuranceModalVisible(true)}>
            <ShieldCheck size={18} color="#059669" strokeWidth={2.2} />
            <PartnerTextInput
              style={styles.inputIconText}
              value={insuranceProvider}
              onChangeText={setInsuranceProvider}
              placeholder="Select provider"
              placeholderTextColor={driverColors.greySoft}
            />
            <Pressable hitSlop={8} onPress={() => setInsuranceModalVisible(true)}>
              <ChevronDown size={18} color={driverColors.grey} />
            </Pressable>
          </Pressable>
        </View>
      </View>

      {/* Sheets & Dialogs */}
      <PartnerUploadSheet
        visible={uploadSheetVisible}
        onTakePhoto={() => void handleTakePhoto()}
        onPickGallery={() => void handlePickGallery()}
        onClose={() => setUploadSheetVisible(false)}
      />

      <PartnerPermissionDialog
        visible={permissionModal.visible}
        type={permissionModal.type}
        onAllow={permissionModal.onAllow}
        onDeny={() => setPermissionModal(prev => ({ ...prev, visible: false }))}
      />

      <PartnerSuccessDialog
        visible={successVisible}
        title="Vehicle Updated!"
        message="Your vehicle details have been saved successfully."
        onDismiss={() => {
          setSuccessVisible(false);
          navigation.goBack();
        }}
      />

      {/* Dropdown Modals */}
      <OptionPickerModal
        visible={typeModalVisible}
        title="Select Vehicle Type"
        options={VEHICLE_TYPES}
        selected={vehicleType}
        onSelect={setVehicleType}
        onClose={() => setTypeModalVisible(false)}
      />

      <OptionPickerModal
        visible={modelModalVisible}
        title="Select Vehicle Model"
        options={VEHICLE_MODELS}
        selected={vehicleModel}
        onSelect={opt => {
          if (opt !== 'Other / Custom Model') {
            setVehicleModel(opt);
          }
        }}
        onClose={() => setModelModalVisible(false)}
      />

      <OptionPickerModal
        visible={insuranceModalVisible}
        title="Select Insurance Provider"
        options={INSURANCE_PROVIDERS}
        selected={insuranceProvider}
        onSelect={opt => {
          if (opt !== 'Other Provider') {
            setInsuranceProvider(opt);
          }
        }}
        onClose={() => setInsuranceModalVisible(false)}
      />
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  vehicleCard: {
    backgroundColor: driverColors.white,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 0.5,
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  artworkBadge: {
    width: 140,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FEF8E8',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  vehicleGraphic: {
    width: 120,
    height: 68,
  },
  uploadedVehiclePhoto: {
    width: 160,
    height: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vehicleDetails: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  vehicleTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: driverColors.ink,
  },
  vehicleSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  vehiclePlate: {
    fontSize: 13,
    color: driverColors.grey,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: driverRadius.pill,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: driverRadius.pill,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: driverColors.ink,
  },
  formCard: {
    backgroundColor: driverColors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 0.5,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.ink,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIconText: {
    flex: 1,
    fontSize: 14,
    color: driverColors.ink,
    fontWeight: '600',
    padding: 0,
  },
  saveButton: {
    backgroundColor: driverColors.amber,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.white,
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: driverColors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: driverColors.ink,
  },
  closeBtn: {
    padding: 4,
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  pickerOptionSelected: {
    backgroundColor: '#ECFDF5',
  },
  pickerOptionText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#334155',
  },
  pickerOptionTextSelected: {
    color: '#059669',
    fontWeight: '800',
  },
});
