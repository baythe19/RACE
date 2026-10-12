import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, ChevronDown, CheckCircle, Truck, ShieldCheck, Hash } from 'lucide-react-native';

import { driverColors, driverRadius, getPressableFeedback } from '../../../theme/driverUi';
import type { PartnerAccountStackParamList } from '../../../types/partnerNavigation';
import PartnerScreenLayout from '../../../components/partner/PartnerScreenLayout';
import PartnerSuccessDialog from '../../../components/partner/dialogs/PartnerSuccessDialog';
import PartnerUploadSheet from '../../../components/partner/dialogs/PartnerUploadSheet';
import VehicleTypeArtwork from '../../../components/partner/VehicleTypeArtwork';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerVehicleInfo'>;

export default function PartnerVehicleInfoScreen({ navigation }: Props) {
  const [vehicleType, setVehicleType] = useState('Tow Truck');
  const [vehicleNumber, setVehicleNumber] = useState('OD-02-TOW-1001');
  const [rcNumber, setRcNumber] = useState('OD0220210001234');
  const [vehicleModel, setVehicleModel] = useState('Tata 407');
  const [insuranceProvider, setInsuranceProvider] = useState('ICICI Lombard');

  const [uploadSheetVisible, setUploadSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate brief save / API update
    setTimeout(() => {
      setSaving(false);
      setSuccessVisible(true);
    }, 600);
  };

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
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </Pressable>
      }>
      {/* Vehicle Highlight Card */}
      <View style={styles.vehicleCard}>
        <View style={styles.artworkWrapper}>
          <VehicleTypeArtwork
            type="flatbed"
            size={90}
            selected={true}
          />
        </View>

        <View style={styles.vehicleDetails}>
          <Text style={styles.vehicleTitle}>{vehicleModel} ({vehicleType})</Text>
          <Text style={styles.vehiclePlate}>{vehicleNumber}</Text>
          
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.changePhotoButton,
            getPressableFeedback(pressed),
          ]}
          onPress={() => setUploadSheetVisible(true)}>
          <Camera size={14} color={driverColors.ink} strokeWidth={2.2} />
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </Pressable>
      </View>

      {/* Form Card */}
      <View style={styles.formCard}>
        {/* Vehicle Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.inputWithIcon}>
            <Truck size={18} color={driverColors.grey} strokeWidth={2} />
            <TextInput
              style={styles.inputIconText}
              value={vehicleType}
              onChangeText={setVehicleType}
              placeholder="e.g. Tow Truck"
              placeholderTextColor={driverColors.greySoft}
            />
            <ChevronDown size={18} color={driverColors.grey} />
          </View>
        </View>

        {/* Vehicle Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Number</Text>
          <View style={styles.inputWithIcon}>
            <Hash size={18} color={driverColors.grey} strokeWidth={2} />
            <TextInput
              style={styles.inputIconText}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder="OD-02-TOW-1001"
              placeholderTextColor={driverColors.greySoft}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* RC Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>RC Number</Text>
          <TextInput
            style={styles.textInput}
            value={rcNumber}
            onChangeText={setRcNumber}
            placeholder="Enter RC number"
            placeholderTextColor={driverColors.greySoft}
            autoCapitalize="characters"
          />
        </View>

        {/* Vehicle Model */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Model (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={vehicleModel}
            onChangeText={setVehicleModel}
            placeholder="e.g. Tata 407"
            placeholderTextColor={driverColors.greySoft}
          />
        </View>

        {/* Insurance Provider */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Insurance Provider</Text>
          <View style={styles.inputWithIcon}>
            <ShieldCheck size={18} color={driverColors.grey} strokeWidth={2} />
            <TextInput
              style={styles.inputIconText}
              value={insuranceProvider}
              onChangeText={setInsuranceProvider}
              placeholder="Select provider"
              placeholderTextColor={driverColors.greySoft}
            />
            <ChevronDown size={18} color={driverColors.grey} />
          </View>
        </View>
      </View>

      {/* Sheets & Dialogs */}
      <PartnerUploadSheet
        visible={uploadSheetVisible}
        onTakePhoto={() => setUploadSheetVisible(false)}
        onPickGallery={() => setUploadSheetVisible(false)}
        onClose={() => setUploadSheetVisible(false)}
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
    </PartnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  vehicleCard: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    alignItems: 'center',
    marginBottom: 16,
  },
  artworkWrapper: {
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleDetails: {
    alignItems: 'center',
    marginVertical: 10,
    gap: 4,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: driverColors.ink,
  },
  vehiclePlate: {
    fontSize: 14,
    color: driverColors.grey,
    fontWeight: '600',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: driverColors.greenPill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: driverRadius.pill,
    marginTop: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: driverColors.green,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '700',
    color: driverColors.green,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: driverRadius.pill,
    backgroundColor: driverColors.light,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    marginTop: 6,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: driverColors.ink,
  },
  formCard: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.ink,
  },
  textInput: {
    backgroundColor: driverColors.light,
    borderRadius: driverRadius.innerCard,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: driverColors.ink,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: driverColors.light,
    borderRadius: driverRadius.innerCard,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: driverColors.hairline,
  },
  inputIconText: {
    flex: 1,
    fontSize: 14,
    color: driverColors.ink,
    padding: 0,
  },
  saveButton: {
    height: 50,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.white,
  },
  disabledButton: {
    opacity: 0.7,
  },
});
