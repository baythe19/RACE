import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Car,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  Info,
  Search,
  Truck,
  X,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import VehicleTypeArtwork from '../../../../components/partner/VehicleTypeArtwork';
import { DRIVER_VEHICLE_TYPE_CARDS } from '../../../../constants/driverVehicleTypes';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'DriverVehicleInfo'>;

const POPULAR_VEHICLE_MODELS = [
  'Tata 407 Recovery Spec',
  'Ashok Leyland Ecomet Tow',
  'Mahindra Bolero Pik-Up Recovery',
  'Eicher Pro 2049 Tow Truck',
  'Isuzu D-Max Flatbed',
  'Force Motors Recovery Van',
  'Maruti Suzuki Super Carry Tow',
  'BharatBenz 1217C Commercial',
  'Other / Custom Vehicle Model',
];

const REF_W = 390;

export default function DriverVehicleInfoScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
  const px = (val: number) => Math.max(1, Math.round(val * scale));

  const driverVehicle = usePartnerRegistrationStore((s) => s.driverVehicle);
  const setDriverVehicle = usePartnerRegistrationStore((s) => s.setDriverVehicle);

  const isFromReview = Boolean(route.params?.fromReview);

  // Model selection modal
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [customModelInput, setCustomModelInput] = useState(driverVehicle.vehicleModel || '');

  // Match selected card id
  const selectedVehicleCardId =
    DRIVER_VEHICLE_TYPE_CARDS.find(
      (c) =>
        c.label.toLowerCase() === (driverVehicle.vehicleType || '').toLowerCase() ||
        c.id.toLowerCase() === (driverVehicle.vehicleType || '').toLowerCase() ||
        (driverVehicle.vehicleType || '').toLowerCase().includes(c.id),
    )?.id || 'flatbed';

  const registeredTo = driverVehicle.registeredTo || 'me';

  const handleBack = () =>
    partnerRegistrationGoBack(navigation, 'DriverVehicleInfo', route.params);

  const handleContinue = () => {
    const chosenCard =
      DRIVER_VEHICLE_TYPE_CARDS.find((c) => c.id === selectedVehicleCardId) ||
      DRIVER_VEHICLE_TYPE_CARDS[0];

    setDriverVehicle({
      vehicleType: driverVehicle.vehicleType || chosenCard.label,
      vehicleNumber: driverVehicle.vehicleNumber.trim() || 'OD 02 AB 1234',
      licenseNumber: driverVehicle.licenseNumber.trim() || 'OD-0220190012345',
      rcNumber: driverVehicle.rcNumber.trim() || 'RC-OD02-2022-987654',
      vehicleModel: driverVehicle.vehicleModel.trim() || 'Tata 407 Recovery Spec',
      registeredTo: driverVehicle.registeredTo || 'me',
    });

    if (isFromReview) {
      navigation.navigate('DriverReview', route.params);
    } else {
      navigation.navigate('DriverDocuments', route.params);
    }
  };

  const handleSelectCard = (cardId: string) => {
    const card = DRIVER_VEHICLE_TYPE_CARDS.find((c) => c.id === cardId);
    if (card) {
      setDriverVehicle({ vehicleType: card.label });
    }
  };

  return (
    <DriverRegistrationLayout
      step={2}
      title="Driver registration"
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel={isFromReview ? 'Save & Return to Review →' : 'Continue →'}>
      {/* Unified Single Card for Vehicle Information (No Shadow, Full Width) */}
      <View style={[styles.card, { padding: px(14), marginBottom: px(14) }]}>
        {/* Card Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={[styles.headerIconBox, { width: px(36), height: px(36), borderRadius: px(10) }]}>
            <Truck size={px(18)} color="#D97706" strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.cardHeaderTitle, { fontSize: px(15) }]}>Vehicle information</Text>
            <Text style={[styles.cardHeaderSubtitle, { fontSize: px(12) }]}>
              Tell us about your vehicle.
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Vehicle Type * (Single Row of 4 Compact Cards Side-by-Side) */}
        <View style={[styles.inputGroup, { marginBottom: px(16) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(12.5), marginBottom: px(8) }]}>
            Vehicle type <Text style={styles.requiredAsterisk}>*</Text>
          </Text>

          <View style={styles.vehicleRow}>
            {DRIVER_VEHICLE_TYPE_CARDS.map((item) => {
              const isSelected = selectedVehicleCardId === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelectCard(item.id)}
                  style={({ pressed }) => [
                    styles.vehicleCard,
                    { paddingVertical: px(10), paddingHorizontal: px(4), borderRadius: px(10) },
                    isSelected ? styles.vehicleCardSelected : styles.vehicleCardIdle,
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.artworkContainer}>
                    <VehicleTypeArtwork
                      type={item.illustrationType}
                      size={px(36)}
                      selected={isSelected}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.vehicleCardLabel,
                      { fontSize: px(11), marginTop: px(6) },
                      isSelected ? styles.vehicleCardLabelSelected : styles.vehicleCardLabelIdle,
                    ]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Vehicle Registration Number */}
        <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(12.5) }]}>
            Vehicle registration number <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={[styles.inputContainer, { height: px(46), paddingHorizontal: px(12) }]}>
            <CreditCard size={px(17)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <TextInput
              style={[styles.textInput, { fontSize: px(14), fontWeight: '600' }]}
              placeholder="e.g. OD 02 AB 1234"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              autoCorrect={false}
              value={driverVehicle.vehicleNumber}
              onChangeText={(text) =>
                setDriverVehicle({
                  vehicleNumber: text.replace(/[^A-Za-z0-9\s]/g, '').toUpperCase(),
                })
              }
            />
          </View>
        </View>

        {/* Driving Licence Number */}
        <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(12.5) }]}>
            Driving licence number <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={[styles.inputContainer, { height: px(46), paddingHorizontal: px(12) }]}>
            <FileText size={px(17)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <TextInput
              style={[styles.textInput, { fontSize: px(14), fontWeight: '600' }]}
              placeholder="Enter Driving License (DL) number"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              autoCorrect={false}
              value={driverVehicle.licenseNumber}
              onChangeText={(text) =>
                setDriverVehicle({
                  licenseNumber: text.replace(/[^A-Za-z0-9\-]/g, '').toUpperCase(),
                })
              }
            />
          </View>
        </View>

        {/* Vehicle Registered To (Clean Radio Buttons - No Bulky Cards) */}
        <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(12.5), marginBottom: px(6) }]}>
            Vehicle registered to <Text style={styles.requiredAsterisk}>*</Text>
          </Text>

          <View style={styles.radioGroup}>
            {/* Option 1: Me */}
            <Pressable
              onPress={() => setDriverVehicle({ registeredTo: 'me' })}
              style={({ pressed }) => [styles.radioRow, pressed && styles.pressed]}>
              <View
                style={[
                  styles.radioCircle,
                  registeredTo === 'me' && styles.radioCircleActive,
                ]}>
                {registeredTo === 'me' ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.radioLabel, { fontSize: px(13) }]}>
                Me / I own this vehicle
              </Text>
            </Pressable>

            {/* Option 2: Someone else */}
            <Pressable
              onPress={() => setDriverVehicle({ registeredTo: 'someone_else' })}
              style={({ pressed }) => [
                styles.radioRow,
                { marginTop: px(8), alignItems: 'flex-start' },
                pressed && styles.pressed,
              ]}>
              <View
                style={[
                  styles.radioCircle,
                  { marginTop: px(2) },
                  registeredTo === 'someone_else' && styles.radioCircleActive,
                ]}>
                {registeredTo === 'someone_else' ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={styles.radioTextWrap}>
                <Text style={[styles.radioLabel, { fontSize: px(13) }]}>
                  Someone else
                </Text>
                <Text style={[styles.radioSubLabel, { fontSize: px(11) }]}>
                  Owner authorisation may be needed
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Vehicle Model (Optional with Dropdown Selector) */}
        <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(12.5) }]}>
            Vehicle model <Text style={styles.optionalText}>(Optional)</Text>
          </Text>
          <Pressable
            onPress={() => {
              setCustomModelInput(driverVehicle.vehicleModel || '');
              setModelModalVisible(true);
            }}
            style={[styles.inputContainer, { height: px(46), paddingHorizontal: px(12) }]}>
            <Car size={px(17)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <Text
              style={[
                styles.textValue,
                { fontSize: px(13.5) },
                !driverVehicle.vehicleModel && styles.textPlaceholder,
              ]}>
              {driverVehicle.vehicleModel || 'Enter vehicle model (optional)'}
            </Text>
            <ChevronDown size={px(18)} color="#6B7280" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Bottom RC & Insurance Notice Box */}
        <View style={[styles.noticeBox, { padding: px(12), borderRadius: px(10) }]}>
          <View style={[styles.noticeIconCircle, { width: px(22), height: px(22), borderRadius: px(11) }]}>
            <Info size={px(13)} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <Text style={[styles.noticeText, { fontSize: px(11.5) }]}>
            RC and insurance details will be checked from uploaded documents.
          </Text>
        </View>
      </View>

      {/* Vehicle Model Dropdown / Picker Modal */}
      <Modal visible={modelModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModelModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: px(28) }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { fontSize: px(16) }]}>Select Vehicle Model</Text>
              <Pressable hitSlop={12} onPress={() => setModelModalVisible(false)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>

            {/* Custom Input */}
            <View style={[styles.modalSearchContainer, { height: px(44), marginBottom: px(12) }]}>
              <Car size={px(18)} color="#9CA3AF" style={{ marginRight: px(8) }} />
              <TextInput
                style={[styles.modalSearchInput, { fontSize: px(14) }]}
                placeholder="Or type custom model..."
                placeholderTextColor="#9CA3AF"
                value={customModelInput}
                onChangeText={setCustomModelInput}
              />
              {customModelInput ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setDriverVehicle({ vehicleModel: customModelInput });
                    setModelModalVisible(false);
                  }}>
                  <Text style={styles.applyText}>Save</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              {POPULAR_VEHICLE_MODELS.map((m) => {
                const isSelected = driverVehicle.vehicleModel === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      if (m === 'Other / Custom Vehicle Model') {
                        setCustomModelInput('');
                      } else {
                        setDriverVehicle({ vehicleModel: m });
                        setModelModalVisible(false);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.modelRow,
                      { paddingVertical: px(12) },
                      isSelected && styles.modelRowSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text
                      style={[
                        styles.modelText,
                        { fontSize: px(13.5) },
                        isSelected && styles.modelTextSelected,
                      ]}>
                      {m}
                    </Text>
                    {isSelected ? <Check size={px(18)} color="#D97706" strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </DriverRegistrationLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    // NO SHADOW
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  cardHeaderSubtitle: {
    color: '#6B7280',
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 14,
  },
  headerIconBox: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  inputGroup: {
    width: '100%',
  },
  inputLabel: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  requiredAsterisk: {
    color: '#DC2626',
    fontWeight: '700',
  },
  optionalText: {
    fontWeight: '400',
    color: '#9CA3AF',
  },
  // 4 Vehicle Cards Row
  vehicleRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  vehicleCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  vehicleCardSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  vehicleCardIdle: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  vehicleCardLabel: {
    fontWeight: '700',
    textAlign: 'center',
  },
  vehicleCardLabelSelected: {
    color: '#B45309',
  },
  vehicleCardLabelIdle: {
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  leftInputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#111827',
    paddingVertical: 0,
    fontWeight: '500',
  },
  textValue: {
    flex: 1,
    color: '#111827',
    fontWeight: '500',
  },
  textPlaceholder: {
    color: '#9CA3AF',
  },
  // Radio Buttons
  radioGroup: {
    paddingVertical: 2,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleActive: {
    borderColor: '#D97706',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D97706',
  },
  radioTextWrap: {
    flex: 1,
  },
  radioLabel: {
    fontWeight: '600',
    color: '#1F2937',
  },
  radioSubLabel: {
    color: '#6B7280',
    marginTop: 1,
  },
  // Notice Box
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginTop: 4,
  },
  noticeIconCircle: {
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    flex: 1,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
  },
  modalSearchInput: {
    flex: 1,
    color: '#111827',
    paddingVertical: 0,
  },
  applyText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modelRowSelected: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  modelText: {
    color: '#374151',
    fontWeight: '500',
  },
  modelTextSelected: {
    color: '#D97706',
    fontWeight: '700',
  },
});
