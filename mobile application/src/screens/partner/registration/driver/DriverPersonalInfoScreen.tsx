import React, { useMemo, useState } from 'react';
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
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  X,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DriverRegistrationLayout from '../../../../components/partner/DriverRegistrationLayout';
import { usePartnerRegistrationStore } from '../../../../store/partnerRegistrationStore';
import type { PartnerRegistrationStackParamList } from '../../../../types/partnerNavigation';
import { partnerRegistrationGoBack } from '../../../../utils/partnerRegistration';

type Props = NativeStackScreenProps<PartnerRegistrationStackParamList, 'DriverPersonalInfo'>;

const POPULAR_CITIES = [
  'Bhubaneswar',
  'Cuttack',
  'Puri',
  'Rourkela',
  'Berhampur',
  'Sambalpur',
  'Angul',
  'Balasore',
  'Jharsuguda',
  'Jajpur',
  'Bhadrak',
  'Baripada',
  'Kendujhar',
  'Rayagada',
  'Dhenkanal',
  'Bargarh',
];

const REF_W = 390;

function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(0, 10);
}

export default function DriverPersonalInfoScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1.22, Math.max(0.88, width / REF_W));
  const px = (val: number) => Math.max(1, Math.round(val * scale));

  const driverPersonal = usePartnerRegistrationStore((s) => s.driverPersonal);
  const setDriverPersonal = usePartnerRegistrationStore((s) => s.setDriverPersonal);

  const isFromReview = Boolean(route.params?.fromReview);

  // Modals state
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [dobModalVisible, setDobModalVisible] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [extraProfileModalVisible, setExtraProfileModalVisible] = useState(false);

  // Temporary DOB editor state
  const [dobDay, setDobDay] = useState(() => {
    const parts = (driverPersonal.dateOfBirth || '1992-05-15').split('-');
    return parts[2] || '15';
  });
  const [dobMonth, setDobMonth] = useState(() => {
    const parts = (driverPersonal.dateOfBirth || '1992-05-15').split('-');
    return parts[1] || '05';
  });
  const [dobYear, setDobYear] = useState(() => {
    const parts = (driverPersonal.dateOfBirth || '1992-05-15').split('-');
    return parts[0] || '1992';
  });

  const filteredCities = useMemo(() => {
    const q = citySearchQuery.trim().toLowerCase();
    if (!q) return POPULAR_CITIES;
    return POPULAR_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [citySearchQuery]);

  const handleBack = () =>
    partnerRegistrationGoBack(navigation, 'DriverPersonalInfo', route.params);

  const handleContinue = () => {
    setDriverPersonal({
      fullName: driverPersonal.fullName.trim() || 'Rajesh Kumar',
      mobileNumber:
        driverPersonal.mobileNumber || route.params?.mobileNumber || '9876543210',
      email: driverPersonal.email || 'rajesh.driver@gmail.com',
      dateOfBirth: driverPersonal.dateOfBirth || '1992-05-15',
      address:
        driverPersonal.address.trim() || 'Plot 42, Saheed Nagar, Janpath Road',
      city: driverPersonal.city || 'Bhubaneswar',
    });

    if (isFromReview) {
      navigation.navigate('DriverReview', route.params);
    } else {
      navigation.navigate('DriverVehicleInfo', route.params);
    }
  };

  const formattedDisplayDob = () => {
    if (!driverPersonal.dateOfBirth) return '15 May 1992';
    const parts = driverPersonal.dateOfBirth.split('-');
    if (parts.length === 3) {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`;
    }
    return driverPersonal.dateOfBirth;
  };

  const saveDobFromModal = () => {
    const y = dobYear.padStart(4, '1990');
    const m = dobMonth.padStart(2, '01');
    const d = dobDay.padStart(2, '01');
    setDriverPersonal({ dateOfBirth: `${y}-${m}-${d}` });
    setDobModalVisible(false);
  };

  const setPresetAge = (age: number) => {
    const targetYear = new Date().getFullYear() - age;
    setDobYear(String(targetYear));
    setDobMonth('05');
    setDobDay('15');
    setDriverPersonal({ dateOfBirth: `${targetYear}-05-15` });
    setDobModalVisible(false);
  };

  return (
    <DriverRegistrationLayout
      step={1}
      title="Driver registration"
      subtitle="Let's start with your basic details."
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel={isFromReview ? 'Save & Return to Review →' : 'Continue →'}>
      {/* Top Section Header Card */}
      <View style={[styles.card, styles.headerCard, { padding: px(16), marginBottom: px(16) }]}>
        <View style={styles.headerRow}>
          <View style={[styles.headerIconBox, { width: px(40), height: px(40), borderRadius: px(10) }]}>
            <User size={px(20)} color="#D97706" strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { fontSize: px(16) }]}>Personal Information</Text>
            <Text style={[styles.headerSubtitle, { fontSize: px(13) }]}>
              Enter your personal details to get started
            </Text>
          </View>
        </View>
      </View>

      {/* Main Form Fields Card */}
      <View style={[styles.card, { padding: px(16), marginBottom: px(16) }]}>
        {/* Full Name */}
        <View style={[styles.inputGroup, { marginBottom: px(16) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(13) }]}>
            Full name <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={[styles.inputContainer, { height: px(48), paddingHorizontal: px(12) }]}>
            <User size={px(18)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <TextInput
              style={[styles.textInput, { fontSize: px(14) }]}
              placeholder="As on driving licence"
              placeholderTextColor="#9CA3AF"
              value={driverPersonal.fullName}
              onChangeText={(fullName) => setDriverPersonal({ fullName })}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Mobile Number (with verified pill) */}
        <View style={[styles.inputGroup, { marginBottom: px(16) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(13) }]}>
            Mobile number <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={[styles.inputContainer, { height: px(48), paddingHorizontal: px(12) }]}>
            <Phone size={px(18)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <Text style={[styles.countryPrefix, { fontSize: px(14) }]}>+91</Text>
            <TextInput
              style={[styles.textInput, { fontSize: px(14) }]}
              placeholder="10-digit mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={10}
              value={driverPersonal.mobileNumber}
              onChangeText={(text) =>
                setDriverPersonal({ mobileNumber: normalizeIndianPhone(text) })
              }
            />
            <View style={styles.verifiedBadge}>
              <Check size={px(12)} color="#15803D" strokeWidth={3} />
              <Text style={[styles.verifiedText, { fontSize: px(11) }]}>Verified</Text>
            </View>
          </View>
        </View>

        {/* Date of Birth */}
        <View style={[styles.inputGroup, { marginBottom: px(16) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(13) }]}>
            Date of birth <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <Pressable
            onPress={() => setDobModalVisible(true)}
            style={[styles.inputContainer, { height: px(48), paddingHorizontal: px(12) }]}>
            <Calendar size={px(18)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <Text
              style={[
                styles.textValue,
                { fontSize: px(14) },
                !driverPersonal.dateOfBirth && styles.textPlaceholder,
              ]}>
              {formattedDisplayDob()}
            </Text>
            <Calendar size={px(16)} color="#6B7280" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Operating City */}
        <View style={[styles.inputGroup, { marginBottom: px(16) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(13) }]}>
            Operating city <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <Pressable
            onPress={() => {
              setCitySearchQuery('');
              setCityModalVisible(true);
            }}
            style={[styles.inputContainer, { height: px(48), paddingHorizontal: px(12) }]}>
            <MapPin size={px(18)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <Text style={[styles.textValue, { fontSize: px(14) }]}>
              {driverPersonal.city || 'Bhubaneswar'}
            </Text>
            <ChevronDown size={px(18)} color="#6B7280" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Current Address */}
        <View style={[styles.inputGroup, { marginBottom: px(16) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(13) }]}>
            Current address <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View
            style={[
              styles.inputContainer,
              styles.addressInputContainer,
              { minHeight: px(72), paddingHorizontal: px(12), paddingVertical: px(10) },
            ]}>
            <MapPin
              size={px(18)}
              color="#9CA3AF"
              strokeWidth={2}
              style={[styles.leftInputIcon, { marginTop: px(2) }]}
            />
            <TextInput
              style={[styles.textInput, styles.multilineInput, { fontSize: px(14) }]}
              placeholder="House/flat no., street, landmark, PIN code"
              placeholderTextColor="#9CA3AF"
              multiline
              scrollEnabled={false}
              numberOfLines={2}
              value={driverPersonal.address}
              onChangeText={(address) => setDriverPersonal({ address })}
            />
          </View>
          <View style={[styles.captionRow, { marginTop: px(4) }]}>
            <Info size={px(12)} color="#9CA3AF" />
            <Text style={[styles.captionText, { fontSize: px(11) }]}>
              Needed for verification
            </Text>
          </View>
        </View>

        {/* Email Address (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: px(13) }]}>
            Email address <Text style={styles.optionalText}>(Optional)</Text>
          </Text>
          <View style={[styles.inputContainer, { height: px(48), paddingHorizontal: px(12) }]}>
            <Mail size={px(18)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <TextInput
              style={[styles.textInput, { fontSize: px(14) }]}
              placeholder="For receipts and monthly summaries"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={driverPersonal.email}
              onChangeText={(email) => setDriverPersonal({ email })}
            />
          </View>
        </View>
      </View>

      {/* Helper Banner 1: Emergency Contact (Amber alert card) */}
      <Pressable
        onPress={() => setEmergencyModalVisible(true)}
        style={({ pressed }) => [
          styles.alertBanner,
          { padding: px(14), marginBottom: px(12), borderRadius: px(12) },
          pressed && styles.pressed,
        ]}>
        <View style={styles.alertContentRow}>
          <View style={[styles.alertIconCircle, { width: px(32), height: px(32), borderRadius: px(16) }]}>
            <ShieldAlert size={px(16)} color="#D97706" strokeWidth={2.2} />
          </View>
          <View style={styles.alertTextWrap}>
            <Text style={[styles.alertTitle, { fontSize: px(13) }]}>
              Add emergency contact before your first job
            </Text>
            {driverPersonal.emergencyContactNumber ? (
              <Text style={[styles.alertDetail, { fontSize: px(12) }]}>
                Saved: {driverPersonal.emergencyContactName || 'Contact'} ({driverPersonal.emergencyContactNumber})
              </Text>
            ) : null}
          </View>
          <View style={styles.alertActionBtn}>
            <Text style={[styles.alertActionText, { fontSize: px(12) }]}>
              {driverPersonal.emergencyContactNumber ? 'Edit' : 'Add'}
            </Text>
            <ChevronRight size={px(14)} color="#D97706" />
          </View>
        </View>
      </Pressable>

      {/* Helper Banner 2: Profile Experience & Languages (Grey card) */}
      <Pressable
        onPress={() => setExtraProfileModalVisible(true)}
        style={({ pressed }) => [
          styles.neutralBanner,
          { padding: px(14), marginBottom: px(24), borderRadius: px(12) },
          pressed && styles.pressed,
        ]}>
        <View style={styles.alertContentRow}>
          <View style={[styles.neutralIconCircle, { width: px(32), height: px(32), borderRadius: px(16) }]}>
            <Sparkles size={px(16)} color="#4B5563" strokeWidth={2.2} />
          </View>
          <View style={styles.alertTextWrap}>
            <Text style={[styles.neutralTitle, { fontSize: px(13) }]}>
              Experience and languages can be added to your profile later
            </Text>
            {driverPersonal.yearsOfExperience || driverPersonal.languages ? (
              <Text style={[styles.neutralDetail, { fontSize: px(12) }]}>
                {[
                  driverPersonal.yearsOfExperience ? `${driverPersonal.yearsOfExperience} yrs exp` : null,
                  driverPersonal.languages || null,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            ) : null}
          </View>
          <View style={styles.alertActionBtn}>
            <Text style={[styles.neutralActionText, { fontSize: px(12) }]}>
              {driverPersonal.yearsOfExperience || driverPersonal.languages ? 'Edit' : 'Add'}
            </Text>
            <ChevronRight size={px(14)} color="#4B5563" />
          </View>
        </View>
      </Pressable>

      {/* City Selector Modal with Search Filter */}
      <Modal visible={cityModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCityModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { maxHeight: px(500) }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { fontSize: px(16) }]}>Select Operating City</Text>
              <Pressable hitSlop={12} onPress={() => setCityModalVisible(false)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>

            {/* Search Input in Modal */}
            <View style={[styles.modalSearchContainer, { height: px(42), marginBottom: px(10) }]}>
              <Search size={px(16)} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.modalSearchInput, { fontSize: px(13) }]}
                placeholder="Search city in Odisha..."
                placeholderTextColor="#9CA3AF"
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
                autoCorrect={false}
              />
              {citySearchQuery ? (
                <Pressable onPress={() => setCitySearchQuery('')} hitSlop={8}>
                  <X size={px(16)} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: px(340) }} keyboardShouldPersistTaps="handled">
              {filteredCities.map((c) => {
                const isSelected = (driverPersonal.city || 'Bhubaneswar') === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setDriverPersonal({ city: c });
                      setCityModalVisible(false);
                    }}
                    style={[
                      styles.cityRow,
                      { paddingVertical: px(12) },
                      isSelected && styles.cityRowSelected,
                    ]}>
                    <Text
                      style={[
                        styles.cityText,
                        { fontSize: px(14) },
                        isSelected && styles.cityTextSelected,
                      ]}>
                      {c}
                    </Text>
                    {isSelected ? <Check size={px(18)} color="#D97706" strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date of Birth Picker Modal with Quick Presets */}
      <Modal visible={dobModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDobModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: px(28) }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { fontSize: px(16) }]}>Set Date of Birth</Text>
              <Pressable hitSlop={12} onPress={() => setDobModalVisible(false)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>
            <Text style={[styles.dobHint, { fontSize: px(12), marginBottom: px(12) }]}>
              Must be at least 18 years old to register as a RACE driver.
            </Text>

            {/* Quick Age Presets for Instant 1-Tap Setting */}
            <View style={[styles.presetsRow, { marginBottom: px(14) }]}>
              {[
                { label: '25 yrs (1999)', age: 25 },
                { label: '30 yrs (1994)', age: 30 },
                { label: '35 yrs (1989)', age: 35 },
              ].map((p) => (
                <Pressable
                  key={p.age}
                  onPress={() => setPresetAge(p.age)}
                  style={styles.presetChip}>
                  <Text style={styles.presetChipText}>{p.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.dobInputRow}>
              <View style={styles.dobCol}>
                <Text style={styles.dobColLabel}>Day (DD)</Text>
                <TextInput
                  style={styles.dobInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={dobDay}
                  onChangeText={setDobDay}
                  placeholder="15"
                />
              </View>
              <View style={styles.dobCol}>
                <Text style={styles.dobColLabel}>Month (MM)</Text>
                <TextInput
                  style={styles.dobInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={dobMonth}
                  onChangeText={setDobMonth}
                  placeholder="05"
                />
              </View>
              <View style={[styles.dobCol, { flex: 1.3 }]}>
                <Text style={styles.dobColLabel}>Year (YYYY)</Text>
                <TextInput
                  style={styles.dobInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={dobYear}
                  onChangeText={setDobYear}
                  placeholder="1992"
                />
              </View>
            </View>
            <Pressable
              onPress={saveDobFromModal}
              style={[styles.primaryModalBtn, { marginTop: px(20), height: px(46) }]}>
              <Text style={[styles.primaryModalBtnText, { fontSize: px(14) }]}>Confirm Date of Birth</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Emergency Contact Modal */}
      <Modal visible={emergencyModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEmergencyModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: px(28) }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { fontSize: px(16) }]}>Emergency Contact</Text>
              <Pressable hitSlop={12} onPress={() => setEmergencyModalVisible(false)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>
            <Text style={[styles.dobHint, { fontSize: px(12), marginBottom: px(16) }]}>
              This contact will only be called in case of road accidents or medical emergencies.
            </Text>
            <View style={{ marginBottom: px(12) }}>
              <Text style={[styles.inputLabel, { fontSize: px(12) }]}>Contact Name</Text>
              <TextInput
                style={[styles.simpleInput, { height: px(44) }]}
                placeholder="e.g. Ramesh Kumar (Brother)"
                value={driverPersonal.emergencyContactName ?? ''}
                onChangeText={(emergencyContactName) =>
                  setDriverPersonal({ emergencyContactName })
                }
              />
            </View>
            <View style={{ marginBottom: px(16) }}>
              <Text style={[styles.inputLabel, { fontSize: px(12) }]}>Mobile Number</Text>
              <TextInput
                style={[styles.simpleInput, { height: px(44) }]}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="10-digit emergency number"
                value={driverPersonal.emergencyContactNumber ?? ''}
                onChangeText={(emergencyContactNumber) =>
                  setDriverPersonal({
                    emergencyContactNumber: normalizeIndianPhone(emergencyContactNumber),
                  })
                }
              />
            </View>
            <Pressable
              onPress={() => setEmergencyModalVisible(false)}
              style={[styles.primaryModalBtn, { height: px(46) }]}>
              <Text style={[styles.primaryModalBtnText, { fontSize: px(14) }]}>Save Emergency Contact</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Extra Profile Modal (Experience & Languages) */}
      <Modal visible={extraProfileModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setExtraProfileModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: px(28) }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { fontSize: px(16) }]}>Experience & Languages</Text>
              <Pressable hitSlop={12} onPress={() => setExtraProfileModalVisible(false)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>
            <Text style={[styles.dobHint, { fontSize: px(12), marginBottom: px(16) }]}>
              Helps match you with premium fleet and corporate towing requests.
            </Text>
            <View style={{ marginBottom: px(12) }}>
              <Text style={[styles.inputLabel, { fontSize: px(12) }]}>Driving Experience (Years)</Text>
              <TextInput
                style={[styles.simpleInput, { height: px(44) }]}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="e.g. 5"
                value={driverPersonal.yearsOfExperience ?? ''}
                onChangeText={(yearsOfExperience) =>
                  setDriverPersonal({ yearsOfExperience })
                }
              />
            </View>
            <View style={{ marginBottom: px(16) }}>
              <Text style={[styles.inputLabel, { fontSize: px(12) }]}>Languages Known</Text>
              <TextInput
                style={[styles.simpleInput, { height: px(44) }]}
                placeholder="e.g. Odia, Hindi, English"
                value={driverPersonal.languages ?? ''}
                onChangeText={(languages) => setDriverPersonal({ languages })}
              />
            </View>
            <Pressable
              onPress={() => setExtraProfileModalVisible(false)}
              style={[styles.primaryModalBtn, { height: px(46) }]}>
              <Text style={[styles.primaryModalBtnText, { fontSize: px(14) }]}>Save Details</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  addressInputContainer: {
    alignItems: 'flex-start',
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
  multilineInput: {
    textAlignVertical: 'top',
    height: '100%',
  },
  textValue: {
    flex: 1,
    color: '#111827',
    fontWeight: '500',
  },
  textPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  countryPrefix: {
    color: '#374151',
    fontWeight: '600',
    marginRight: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 4,
  },
  verifiedText: {
    color: '#15803D',
    fontWeight: '700',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  captionText: {
    color: '#9CA3AF',
  },
  alertBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconCircle: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  alertTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  alertTitle: {
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 18,
  },
  alertDetail: {
    color: '#B45309',
    marginTop: 2,
  },
  alertActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  alertActionText: {
    color: '#D97706',
    fontWeight: '700',
  },
  neutralBanner: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  neutralIconCircle: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  neutralTitle: {
    fontWeight: '500',
    color: '#4B5563',
    lineHeight: 18,
  },
  neutralDetail: {
    color: '#6B7280',
    marginTop: 2,
  },
  neutralActionText: {
    color: '#4B5563',
    fontWeight: '700',
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
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cityRowSelected: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  cityText: {
    color: '#374151',
    fontWeight: '500',
  },
  cityTextSelected: {
    color: '#D97706',
    fontWeight: '700',
  },
  dobHint: {
    color: '#6B7280',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  dobInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dobCol: {
    flex: 1,
  },
  dobColLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  dobInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    height: 44,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  simpleInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  primaryModalBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryModalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
