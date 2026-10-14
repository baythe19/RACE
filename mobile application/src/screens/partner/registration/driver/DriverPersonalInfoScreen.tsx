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
  ChevronLeft,
  ChevronRight,
  Info,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldAlert,
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

const FULL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Common driver birth years (18+ to 55+ years old)
const DRIVER_YEARS = Array.from({ length: 2008 - 1970 + 1 }, (_, i) => 2008 - i);

const REF_W = 390;

function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(0, 10);
}

function toNumericDobDisplay(isoDate?: string): string {
  if (!isoDate) return '15/05/1996';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
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

  // Date of Birth state (Display strictly numeric DD/MM/YYYY)
  const [typedDob, setTypedDob] = useState(() =>
    toNumericDobDisplay(driverPersonal.dateOfBirth || '1996-05-15'),
  );

  // Interactive visual calendar state
  const [calendarYear, setCalendarYear] = useState(() => {
    const parts = (driverPersonal.dateOfBirth || '1996-05-15').split('-');
    return parseInt(parts[0] || '1996', 10);
  });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const parts = (driverPersonal.dateOfBirth || '1996-05-15').split('-');
    return parseInt(parts[1] || '5', 10);
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    const parts = (driverPersonal.dateOfBirth || '1996-05-15').split('-');
    return parseInt(parts[2] || '15', 10);
  });

  // Modal direct inputs
  const [modalInputDay, setModalInputDay] = useState(() => String(selectedDay).padStart(2, '0'));
  const [modalInputMonth, setModalInputMonth] = useState(() => String(calendarMonth).padStart(2, '0'));
  const [modalInputYear, setModalInputYear] = useState(() => String(calendarYear));

  const filteredCities = useMemo(() => {
    const q = citySearchQuery.trim().toLowerCase();
    if (!q) return POPULAR_CITIES;
    return POPULAR_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [citySearchQuery]);

  const handleBack = () =>
    partnerRegistrationGoBack(navigation, 'DriverPersonalInfo', route.params);

  const handleContinue = () => {
    const isoDob = `${modalInputYear}-${modalInputMonth.padStart(2, '0')}-${modalInputDay.padStart(2, '0')}`;
    setDriverPersonal({
      fullName: driverPersonal.fullName.trim() || 'Rajesh Kumar',
      mobileNumber:
        driverPersonal.mobileNumber || route.params?.mobileNumber || '9876543210',
      email: driverPersonal.email || 'rajesh.driver@gmail.com',
      dateOfBirth: driverPersonal.dateOfBirth || isoDob || '1996-05-15',
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

  // Direct typing handler with automatic slash insertion: DD/MM/YYYY
  const handleTypedDobChange = (text: string) => {
    let digits = text.replace(/[^0-9]/g, '');
    if (digits.length > 8) digits = digits.slice(0, 8);
    let formatted = digits;
    if (digits.length > 2 && digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }
    setTypedDob(formatted);

    if (digits.length === 8) {
      const d = parseInt(digits.slice(0, 2), 10);
      const m = parseInt(digits.slice(2, 4), 10);
      const y = parseInt(digits.slice(4, 8), 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1950 && y <= 2010) {
        const dd = String(d).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const yyyy = String(y);
        const iso = `${yyyy}-${mm}-${dd}`;
        setDriverPersonal({ dateOfBirth: iso });
        setSelectedDay(d);
        setCalendarMonth(m);
        setCalendarYear(y);
        setModalInputDay(dd);
        setModalInputMonth(mm);
        setModalInputYear(yyyy);
      }
    }
  };

  // Calendar Day Selection
  const handleSelectDay = (dayNum: number) => {
    setSelectedDay(dayNum);
    const dd = String(dayNum).padStart(2, '0');
    setModalInputDay(dd);
    setModalInputMonth(String(calendarMonth).padStart(2, '0'));
    setModalInputYear(String(calendarYear));
  };

  const handleConfirmCalendar = () => {
    const d = parseInt(modalInputDay || String(selectedDay), 10) || 15;
    const m = parseInt(modalInputMonth || String(calendarMonth), 10) || 5;
    const y = parseInt(modalInputYear || String(calendarYear), 10) || 1996;

    const clampedDay = Math.min(31, Math.max(1, d));
    const clampedMonth = Math.min(12, Math.max(1, m));
    const clampedYear = Math.min(2010, Math.max(1950, y));

    const dd = String(clampedDay).padStart(2, '0');
    const mm = String(clampedMonth).padStart(2, '0');
    const yyyy = String(clampedYear);
    const iso = `${yyyy}-${mm}-${dd}`;
    const display = `${dd}/${mm}/${yyyy}`;

    setDriverPersonal({ dateOfBirth: iso });
    setTypedDob(display);
    setSelectedDay(clampedDay);
    setCalendarMonth(clampedMonth);
    setCalendarYear(clampedYear);
    setDobModalVisible(false);
  };

  // Calendar days grid computation
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const startWeekday = new Date(calendarYear, calendarMonth - 1, 1).getDay();

  const calendarCells: Array<number | null> = [];
  for (let i = 0; i < startWeekday; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const verifiedPhoneDisplay = normalizeIndianPhone(
    driverPersonal.mobileNumber || route.params?.mobileNumber || '9876543210',
  );

  return (
    <DriverRegistrationLayout
      step={1}
      title="Driver registration"
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel={isFromReview ? 'Save & Return' : 'Continue'}>
      {/* Unified Single Card for Personal Information (No Shadow, Full Width) */}
      <View style={[styles.card, { padding: px(14), marginBottom: px(12) }]}>
        {/* Card Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={[styles.headerIconBox, { width: px(36), height: px(36), borderRadius: px(10) }]}>
            <User size={px(18)} color="#D97706" strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.cardHeaderTitle, { fontSize: px(15) }]}>Personal Information</Text>
            <Text style={[styles.cardHeaderSubtitle, { fontSize: px(12) }]}>
              Enter your personal details to get started
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Full Name */}
        <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
          <View style={styles.inputLabelRow}>
            <Text style={[styles.inputLabel, { fontSize: px(12.5) }]}>
              Full name <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            {driverPersonal.fullName.length >= 25 ? (
              <Text style={[styles.charCountText, { fontSize: px(10.5) }]}>
                {driverPersonal.fullName.length}/40
              </Text>
            ) : null}
          </View>
          <View style={[styles.inputContainer, { height: px(46), paddingHorizontal: px(12) }]}>
            <User size={px(17)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <TextInput
              style={[styles.textInput, { fontSize: px(14) }]}
              placeholder="As on driving licence"
              placeholderTextColor="#9CA3AF"
              value={driverPersonal.fullName}
              maxLength={40}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^a-zA-Z\s.-]/g, '');
                setDriverPersonal({ fullName: cleaned });
              }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Mobile Number (Locked & Verified - Read-Only) */}
        <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(12.5) }]}>
            Mobile number <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View
            style={[
              styles.inputContainer,
              styles.lockedInputContainer,
              { height: px(46), paddingHorizontal: px(12) },
            ]}>
            <Phone size={px(17)} color="#6B7280" strokeWidth={2} style={styles.leftInputIcon} />
            <Text style={[styles.countryPrefix, { fontSize: px(14) }]}>+91</Text>
            <TextInput
              style={[styles.textInput, styles.lockedTextInput, { fontSize: px(14) }]}
              value={verifiedPhoneDisplay}
              editable={false}
              selectTextOnFocus={false}
            />
            <View style={styles.verifiedBadge}>
              <Check size={px(11)} color="#15803D" strokeWidth={3} />
              <Text style={[styles.verifiedText, { fontSize: px(11) }]}>Verified</Text>
            </View>
          </View>
        </View>

        {/* Date of Birth (DD/MM/YYYY with Dual-Interaction: Direct Input + Interactive Calendar Modal) */}
        <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(12.5) }]}>
            Date of birth <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={[styles.inputContainer, { height: px(46), paddingHorizontal: px(12) }]}>
            <Calendar size={px(17)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <TextInput
              style={[styles.textInput, { fontSize: px(14) }]}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={10}
              value={typedDob}
              onChangeText={handleTypedDobChange}
            />
            <Pressable
              onPress={() => {
                setModalInputDay(String(selectedDay).padStart(2, '0'));
                setModalInputMonth(String(calendarMonth).padStart(2, '0'));
                setModalInputYear(String(calendarYear));
                setDobModalVisible(true);
              }}
              hitSlop={8}
              style={styles.calendarIconButton}
              accessibilityRole="button"
              accessibilityLabel="Open Calendar">
              <Calendar size={px(18)} color="#D97706" strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        {/* Operating City */}
        <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
          <Text style={[styles.inputLabel, { fontSize: px(12.5) }]}>
            Operating city <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <Pressable
            onPress={() => {
              setCitySearchQuery('');
              setCityModalVisible(true);
            }}
            style={[styles.inputContainer, { height: px(46), paddingHorizontal: px(12) }]}>
            <MapPin size={px(17)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <Text style={[styles.textValue, { fontSize: px(14) }]}>
              {driverPersonal.city || 'Bhubaneswar'}
            </Text>
            <ChevronDown size={px(18)} color="#6B7280" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Current Address */}
        <View style={[styles.inputGroup, { marginBottom: px(14) }]}>
          <View style={styles.inputLabelRow}>
            <Text style={[styles.inputLabel, { fontSize: px(12.5) }]}>
              Current address <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <Text style={[styles.charCountText, { fontSize: px(10.5) }]}>
              {driverPersonal.address.length}/120
            </Text>
          </View>
          <View
            style={[
              styles.inputContainer,
              styles.addressInputContainer,
              { minHeight: px(68), paddingHorizontal: px(12), paddingVertical: px(8) },
            ]}>
            <MapPin
              size={px(17)}
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
              maxLength={120}
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
          <Text style={[styles.inputLabel, { fontSize: px(12.5) }]}>
            Email address <Text style={styles.optionalText}>(Optional)</Text>
          </Text>
          <View style={[styles.inputContainer, { height: px(46), paddingHorizontal: px(12) }]}>
            <Mail size={px(17)} color="#9CA3AF" strokeWidth={2} style={styles.leftInputIcon} />
            <TextInput
              style={[styles.textInput, { fontSize: px(14) }]}
              placeholder="For receipts and monthly summaries"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
              value={driverPersonal.email}
              onChangeText={(email) => setDriverPersonal({ email: email.trim() })}
            />
          </View>
        </View>
      </View>

      {/* Emergency Contact Card (Slimmer Height, Full Card Width) */}
      <Pressable
        onPress={() => setEmergencyModalVisible(true)}
        style={({ pressed }) => [
          styles.alertBanner,
          { paddingVertical: px(10), paddingHorizontal: px(12), marginBottom: px(16), borderRadius: px(10) },
          pressed && styles.pressed,
        ]}>
        <View style={styles.alertContentRow}>
          <View style={[styles.alertIconCircle, { width: px(28), height: px(28), borderRadius: px(14) }]}>
            <ShieldAlert size={px(15)} color="#D97706" strokeWidth={2.2} />
          </View>
          <View style={styles.alertTextWrap}>
            <Text style={[styles.alertTitle, { fontSize: px(12.5) }]} numberOfLines={1}>
              {driverPersonal.emergencyContactNumber
                ? `Emergency: ${driverPersonal.emergencyContactName || 'Saved'} (${driverPersonal.emergencyContactNumber})`
                : 'Add emergency contact before first job'}
            </Text>
          </View>
          <View style={styles.alertActionBtn}>
            <Text style={[styles.alertActionText, { fontSize: px(12) }]}>
              {driverPersonal.emergencyContactNumber ? 'Edit' : 'Add'}
            </Text>
            <ChevronRight size={px(14)} color="#D97706" />
          </View>
        </View>
      </Pressable>

      {/* Operating City Modal */}
      <Modal visible={cityModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setCityModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { maxHeight: '80%' }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { fontSize: px(16) }]}>Select Operating City</Text>
              <Pressable hitSlop={12} onPress={() => setCityModalVisible(false)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>

            <View style={[styles.modalSearchContainer, { height: px(42), marginBottom: px(12) }]}>
              <Search size={px(18)} color="#9CA3AF" style={{ marginRight: px(8) }} />
              <TextInput
                style={[styles.modalSearchInput, { fontSize: px(14) }]}
                placeholder="Search city in Odisha..."
                placeholderTextColor="#9CA3AF"
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
                autoCorrect={false}
              />
              {citySearchQuery ? (
                <Pressable hitSlop={8} onPress={() => setCitySearchQuery('')}>
                  <X size={px(16)} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {filteredCities.map((c) => {
                const isSelected = (driverPersonal.city || 'Bhubaneswar') === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setDriverPersonal({ city: c });
                      setCityModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.cityRow,
                      { paddingVertical: px(12) },
                      isSelected && styles.cityRowSelected,
                      pressed && styles.pressed,
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

      {/* Interactive Calendar Modal Box (Compact Box with Month Grid & Direct Inputs) */}
      <Modal visible={dobModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlayCenter} onPress={() => setDobModalVisible(false)}>
          <Pressable
            style={[styles.calendarModalBox, { padding: px(16), borderRadius: px(16) }]}
            onPress={(e) => e.stopPropagation()}>
            {/* Box Header */}
            <View style={styles.calendarBoxHeader}>
              <Text style={[styles.calendarBoxTitle, { fontSize: px(15) }]}>Select Date of Birth</Text>
              <Pressable hitSlop={12} onPress={() => setDobModalVisible(false)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>

            {/* Quick Year Selector Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearScrollContainer}
              style={{ marginBottom: px(10) }}>
              {DRIVER_YEARS.map((y) => {
                const isYearActive = calendarYear === y;
                return (
                  <Pressable
                    key={y}
                    onPress={() => {
                      setCalendarYear(y);
                      setModalInputYear(String(y));
                    }}
                    style={[
                      styles.yearChip,
                      isYearActive && styles.yearChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.yearChipText,
                        isYearActive && styles.yearChipTextActive,
                      ]}>
                      {y}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Month Header Navigation: < Month YYYY > */}
            <View style={[styles.monthNavRow, { marginBottom: px(8) }]}>
              <Pressable
                onPress={() => {
                  if (calendarMonth === 1) {
                    setCalendarMonth(12);
                    setCalendarYear((y) => y - 1);
                    setModalInputYear(String(calendarYear - 1));
                    setModalInputMonth('12');
                  } else {
                    const nextM = calendarMonth - 1;
                    setCalendarMonth(nextM);
                    setModalInputMonth(String(nextM).padStart(2, '0'));
                  }
                }}
                hitSlop={10}
                style={styles.navArrowBtn}>
                <ChevronLeft size={px(20)} color="#111827" strokeWidth={2.4} />
              </Pressable>

              <Text style={[styles.monthNavTitle, { fontSize: px(14) }]}>
                {FULL_MONTH_NAMES[calendarMonth - 1]} {calendarYear}
              </Text>

              <Pressable
                onPress={() => {
                  if (calendarMonth === 12) {
                    setCalendarMonth(1);
                    setCalendarYear((y) => y + 1);
                    setModalInputYear(String(calendarYear + 1));
                    setModalInputMonth('01');
                  } else {
                    const nextM = calendarMonth + 1;
                    setCalendarMonth(nextM);
                    setModalInputMonth(String(nextM).padStart(2, '0'));
                  }
                }}
                hitSlop={10}
                style={styles.navArrowBtn}>
                <ChevronRight size={px(20)} color="#111827" strokeWidth={2.4} />
              </Pressable>
            </View>

            {/* Weekday Row */}
            <View style={styles.weekdayRow}>
              {WEEKDAY_HEADERS.map((w) => (
                <Text key={w} style={styles.weekdayText}>
                  {w}
                </Text>
              ))}
            </View>

            {/* Days Grid (7 columns) */}
            <View style={styles.daysGrid}>
              {calendarCells.map((cellDay, idx) => {
                if (cellDay === null) {
                  return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
                }
                const isSelected = selectedDay === cellDay;
                return (
                  <Pressable
                    key={`day-${cellDay}`}
                    onPress={() => handleSelectDay(cellDay)}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}>
                    <Text
                      style={[
                        styles.dayCellText,
                        isSelected && styles.dayCellTextSelected,
                      ]}>
                      {cellDay}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Direct Input Row in Box: DD / MM / YYYY */}
            <View style={[styles.modalManualRow, { marginTop: px(10) }]}>
              <View style={styles.manualInputGroup}>
                <Text style={styles.manualInputLabel}>Day</Text>
                <TextInput
                  style={styles.manualInputField}
                  value={modalInputDay}
                  onChangeText={(val) => {
                    const num = val.replace(/[^0-9]/g, '').slice(0, 2);
                    setModalInputDay(num);
                    if (num) setSelectedDay(parseInt(num, 10));
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="DD"
                />
              </View>
              <Text style={styles.manualDivider}>/</Text>
              <View style={styles.manualInputGroup}>
                <Text style={styles.manualInputLabel}>Month</Text>
                <TextInput
                  style={styles.manualInputField}
                  value={modalInputMonth}
                  onChangeText={(val) => {
                    const num = val.replace(/[^0-9]/g, '').slice(0, 2);
                    setModalInputMonth(num);
                    const mInt = parseInt(num, 10);
                    if (mInt >= 1 && mInt <= 12) setCalendarMonth(mInt);
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="MM"
                />
              </View>
              <Text style={styles.manualDivider}>/</Text>
              <View style={[styles.manualInputGroup, { flex: 1.3 }]}>
                <Text style={styles.manualInputLabel}>Year</Text>
                <TextInput
                  style={styles.manualInputField}
                  value={modalInputYear}
                  onChangeText={(val) => {
                    const num = val.replace(/[^0-9]/g, '').slice(0, 4);
                    setModalInputYear(num);
                    const yInt = parseInt(num, 10);
                    if (yInt >= 1950 && yInt <= 2010) setCalendarYear(yInt);
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="YYYY"
                />
              </View>
            </View>

            {/* Confirm CTA */}
            <Pressable
              onPress={handleConfirmCalendar}
              style={[styles.primaryModalBtn, { marginTop: px(12), height: px(44) }]}>
              <Text style={[styles.primaryModalBtnText, { fontSize: px(14) }]}>
                Confirm Date ({modalInputDay.padStart(2, '0')}/{modalInputMonth.padStart(2, '0')}/{modalInputYear})
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Emergency Contact Modal */}
      <Modal visible={emergencyModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setEmergencyModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: px(28) }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { fontSize: px(16) }]}>Emergency Contact</Text>
              <Pressable hitSlop={12} onPress={() => setEmergencyModalVisible(false)}>
                <X size={px(20)} color="#4B5563" />
              </Pressable>
            </View>
            <Text style={[styles.dobHint, { fontSize: px(12), marginBottom: px(14) }]}>
              This contact will only be called in case of road accidents or medical emergencies.
            </Text>
            <View style={{ marginBottom: px(12) }}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { fontSize: px(12) }]}>Contact Name</Text>
                {(driverPersonal.emergencyContactName ?? '').length >= 20 ? (
                  <Text style={[styles.charCountText, { fontSize: px(10.5) }]}>
                    {(driverPersonal.emergencyContactName ?? '').length}/35
                  </Text>
                ) : null}
              </View>
              <TextInput
                style={[styles.simpleInput, { height: px(44) }]}
                placeholder="e.g. Ramesh Kumar (Brother)"
                maxLength={35}
                value={driverPersonal.emergencyContactName ?? ''}
                onChangeText={(emergencyContactName) =>
                  setDriverPersonal({
                    emergencyContactName: emergencyContactName.replace(/[^a-zA-Z\s().-]/g, ''),
                  })
                }
              />
            </View>
            <View style={{ marginBottom: px(16) }}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { fontSize: px(12) }]}>Mobile Number</Text>
                {(driverPersonal.emergencyContactNumber ?? '').length > 0 ? (
                  <Text style={[styles.charCountText, { fontSize: px(10.5) }]}>
                    {(driverPersonal.emergencyContactNumber ?? '').length}/10
                  </Text>
                ) : null}
              </View>
              <TextInput
                style={[styles.simpleInput, { height: px(44) }]}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="10-digit emergency number"
                value={driverPersonal.emergencyContactNumber ?? ''}
                onChangeText={(emergencyContactNumber) =>
                  setDriverPersonal({
                    emergencyContactNumber: normalizeIndianPhone(
                      emergencyContactNumber.replace(/[^0-9]/g, ''),
                    ),
                  })
                }
              />
            </View>
            <Pressable
              onPress={() => setEmergencyModalVisible(false)}
              style={[styles.primaryModalBtn, { height: px(44) }]}>
              <Text style={[styles.primaryModalBtnText, { fontSize: px(14) }]}>Save Emergency Contact</Text>
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
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  charCountText: {
    fontSize: 10.5,
    color: '#9CA3AF',
    fontWeight: '500',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lockedInputContainer: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  lockedTextInput: {
    color: '#374151',
    fontWeight: '600',
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
  textValue: {
    flex: 1,
    color: '#111827',
    fontWeight: '500',
  },
  calendarIconButton: {
    padding: 6,
  },
  multilineInput: {
    textAlignVertical: 'top',
    height: '100%',
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
    elevation: 0,
    shadowOpacity: 0,
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
  pressed: {
    opacity: 0.85,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  calendarModalBox: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 360,
  },
  calendarBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarBoxTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  yearScrollContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  yearChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  yearChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  yearChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  yearChipTextActive: {
    color: '#D97706',
    fontWeight: '700',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  monthNavTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 32,
  },
  dayCell: {
    width: '14.28%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: '#F59E0B',
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalManualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manualInputGroup: {
    flex: 1,
  },
  manualInputLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  manualInputField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    height: 36,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  manualDivider: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 14,
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
    backgroundColor: '#FFFFFF',
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
  simpleInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  primaryModalBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryModalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
