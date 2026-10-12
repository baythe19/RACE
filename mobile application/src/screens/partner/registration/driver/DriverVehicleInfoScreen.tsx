import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Award,
  Car,
  Check,
  CreditCard,
  FileText,
  Info,
  ShieldCheck,
  Truck,
  User,
  Users,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import VehicleTypeArtwork from '../../../../components/partner/VehicleTypeArtwork';
import { DRIVER_VEHICLE_TYPE_CARDS } from '../../../../constants/driverVehicleTypes';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'DriverVehicleInfo'>;

const REF_W = 390;

export default function DriverVehicleInfoScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
  const px = (val: number) => Math.max(1, Math.round(val * scale));

  const driverVehicle = usePartnerRegistrationStore((s) => s.driverVehicle);
  const setDriverVehicle = usePartnerRegistrationStore((s) => s.setDriverVehicle);

  const isFromReview = Boolean(route.params?.fromReview);

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
      subtitle="Tell us about your vehicle."
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel={isFromReview ? 'Save & Return to Review →' : 'Continue →'}>
      {/* Top Header Card */}
      <View style={[styles.card, styles.headerCard, { padding: px(16), marginBottom: px(16) }]}>
        <View style={styles.headerRow}>
          <View style={[styles.headerIconBox, { width: px(40), height: px(40), borderRadius: px(10) }]}>
            <Truck size={px(20)} color="#D97706" strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { fontSize: px(16) }]}>Vehicle Information</Text>
            <Text style={[styles.headerSubtitle, { fontSize: px(13) }]}>
              Select vehicle type and enter registration details
            </Text>
          </View>
        </View>
      </View>

      {/* Vehicle Type Selection Cards */}
      <View style={[styles.card, { padding: px(16), marginBottom: px(16) }]}>
        <Text style={[styles.sectionHeading, { fontSize: px(14), marginBottom: px(4) }]}>
          Vehicle Type <Text style={styles.requiredAsterisk}>*</Text>
        </Text>
        <Text style={[styles.sectionSubtitle, { fontSize: px(12), marginBottom: px(14) }]}>
          Choose the primary vehicle configuration you operate
        </Text>

        <View style={styles.gridContainer}>
          {DRIVER_VEHICLE_TYPE_CARDS.map((item) => {
            const isSelected = selectedVehicleCardId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleSelectCard(item.id)}
                style={({ pressed }) => [
                  styles.vehicleCard,
                  { padding: px(12), borderRadius: px(12) },
                  isSelected ? styles.vehicleCardSelected : styles.vehicleCardIdle,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.vehicleCardTop}>
                  <VehicleTypeArtwork
                    type={item.illustrationType}
                    size={px(42)}
                    selected={isSelected}
                  />
                  {isSelected ? (
                    <View style={[styles.checkCircle, { width: px(18), height: px(18), borderRadius: px(9) }]}>
                      <Check size={px(12)} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.vehicleCardLabel,
                    { fontSize: px(14), marginTop: px(8) },
                    isSelected && styles.vehicleCardLabelSelected,
                  ]}>
                  {item.label}
                </Text>

                <Text
                  style={[
                    styles.vehicleCardDesc,
                    { fontSize: px(11), marginTop: px(2) },
                    isSelected && styles.vehicleCardDescSelected,
                  ]}
                  numberOfLines={2}>
                  {item.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Vehicle Registration & Licence Form Fields Card */}
      <View style={[styles.card, { padding: px(16), marginBottom: px(16) }]}>
        {/* Vehicle Registration Number */}
        <View style={[styles.inputGroup, { marginBottom: px(16) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(13) }]}>
            Vehicle registration number <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={[styles.inputContainer, { height: px(48), paddingHorizontal: px(12) }]}>
            <CreditCard size={px(18)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
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
          <Text style={[styles.helperCaption, { fontSize: px(11), marginTop: px(4) }]}>
            Must match the vehicle RC document
          </Text>
        </View>

        {/* Driving Licence Number */}
        <View style={[styles.inputGroup, { marginBottom: px(16) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(13) }]}>
            Driving licence number <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={[styles.inputContainer, { height: px(48), paddingHorizontal: px(12) }]}>
            <Award size={px(18)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
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

        {/* Vehicle Registered To (Ownership Radio Group) */}
        <View style={[styles.inputGroup, { marginBottom: px(16) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(13) }]}>
            Vehicle registered to <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.radioGroup}>
            {/* Option 1: Me */}
            <Pressable
              onPress={() => setDriverVehicle({ registeredTo: 'me' })}
              style={({ pressed }) => [
                styles.radioOptionCard,
                { padding: px(12), borderRadius: px(10) },
                registeredTo === 'me' ? styles.radioSelected : styles.radioIdle,
                pressed && styles.pressed,
              ]}>
              <View style={styles.radioTopRow}>
                <View
                  style={[
                    styles.radioDotOuter,
                    registeredTo === 'me' && styles.radioDotOuterSelected,
                  ]}>
                  {registeredTo === 'me' ? <View style={styles.radioDotInner} /> : null}
                </View>
                <View style={styles.radioTextWrap}>
                  <Text style={[styles.radioLabel, { fontSize: px(13) }]}>
                    Me / I own this vehicle
                  </Text>
                  <Text style={[styles.radioSubLabel, { fontSize: px(11) }]}>
                    Registered in your name
                  </Text>
                </View>
                <User size={px(16)} color={registeredTo === 'me' ? '#D97706' : '#9CA3AF'} />
              </View>
            </Pressable>

            {/* Option 2: Someone else */}
            <Pressable
              onPress={() => setDriverVehicle({ registeredTo: 'someone_else' })}
              style={({ pressed }) => [
                styles.radioOptionCard,
                { padding: px(12), borderRadius: px(10), marginTop: px(8) },
                registeredTo === 'someone_else' ? styles.radioSelected : styles.radioIdle,
                pressed && styles.pressed,
              ]}>
              <View style={styles.radioTopRow}>
                <View
                  style={[
                    styles.radioDotOuter,
                    registeredTo === 'someone_else' && styles.radioDotOuterSelected,
                  ]}>
                  {registeredTo === 'someone_else' ? <View style={styles.radioDotInner} /> : null}
                </View>
                <View style={styles.radioTextWrap}>
                  <Text style={[styles.radioLabel, { fontSize: px(13) }]}>
                    Someone else
                  </Text>
                  <Text style={[styles.radioSubLabel, { fontSize: px(11) }]}>
                    Owner authorisation may be needed
                  </Text>
                </View>
                <Users
                  size={px(16)}
                  color={registeredTo === 'someone_else' ? '#D97706' : '#9CA3AF'}
                />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Vehicle Model (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: px(13) }]}>
            Vehicle model <Text style={styles.optionalText}>(Optional)</Text>
          </Text>
          <View style={[styles.inputContainer, { height: px(48), paddingHorizontal: px(12) }]}>
            <Car size={px(18)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <TextInput
              style={[styles.textInput, { fontSize: px(14) }]}
              placeholder="e.g. Tata 407 Recovery Spec / Isuzu D-Max"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoCorrect={false}
              value={driverVehicle.vehicleModel}
              onChangeText={(vehicleModel) => setDriverVehicle({ vehicleModel })}
            />
          </View>
        </View>
      </View>

      {/* Bottom Info Banner */}
      <View
        style={[
          styles.infoBanner,
          { padding: px(14), marginBottom: px(24), borderRadius: px(12) },
        ]}>
        <View style={styles.infoBannerRow}>
          <View style={[styles.infoIconCircle, { width: px(28), height: px(28), borderRadius: px(14) }]}>
            <Info size={px(16)} color="#2563EB" strokeWidth={2.2} />
          </View>
          <Text style={[styles.infoBannerText, { fontSize: px(12) }]}>
            RC and insurance details will be checked from uploaded documents in the next step.
          </Text>
        </View>
      </View>
    </DriverRegistrationLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBox: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    color: '#6B7280',
    lineHeight: 18,
  },
  sectionHeading: {
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    color: '#6B7280',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vehicleCard: {
    width: '48%',
    borderWidth: 1.5,
  },
  vehicleCardSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  vehicleCardIdle: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E5E7EB',
  },
  vehicleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
  },
  checkCircle: {
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCardLabel: {
    fontWeight: '700',
    color: '#111827',
  },
  vehicleCardLabelSelected: {
    color: '#B45309',
  },
  vehicleCardDesc: {
    color: '#6B7280',
    lineHeight: 15,
  },
  vehicleCardDescSelected: {
    color: '#78350F',
  },
  inputGroup: {
    width: '100%',
  },
  inputLabel: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#DC2626',
    fontWeight: '700',
  },
  optionalText: {
    fontWeight: '400',
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
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
  },
  helperCaption: {
    color: '#9CA3AF',
  },
  radioGroup: {
    width: '100%',
  },
  radioOptionCard: {
    borderWidth: 1.5,
  },
  radioSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  radioIdle: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  radioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioDotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioDotOuterSelected: {
    borderColor: '#D97706',
  },
  radioDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  radioTextWrap: {
    flex: 1,
  },
  radioLabel: {
    fontWeight: '700',
    color: '#111827',
  },
  radioSubLabel: {
    color: '#6B7280',
    marginTop: 1,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconCircle: {
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoBannerText: {
    flex: 1,
    color: '#1E40AF',
    lineHeight: 18,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.85,
  },
});
