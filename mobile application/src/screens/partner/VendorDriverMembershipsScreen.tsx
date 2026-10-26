import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  Check,
  CheckCircle2,
  Clock3,
  Info,
  Phone,
  ShieldCheck,
  Star,
  UserCheck,
  ClipboardList,
  MoreVertical,
  UserRound,
  UserRoundPlus,
  X,
  Sparkles,
} from 'lucide-react-native';
import { jumpToPartnerJobsScreen } from '../../navigation/partnerNavigationRef';
import { useVendorBookingsQuery } from '../../services/vendor/useVendorBookingsQueries';
import AppScreenLayout from '../../components/ui/AppScreenLayout';
import { PartnerText } from '../../components/partner/PartnerText';
import { useScreenPx } from '../../hooks/useScreenPx';
import { usePartnerDialog } from '../../hooks/usePartnerDialog';
import {
  useRevokeVendorDriverMembershipMutation,
  useVendorMembershipsQuery,
} from '../../services/vendor/useVendorMembershipQueries';
import {
  sendVendorDriverOnboardingOtp,
  verifyVendorDriverOnboardingOtp,
  createVendorStaffDriver,
} from '../../services/vendor/vendorDriversApi';
import type { VendorMembership } from '../../services/vendor/vendorMembershipApi';

const AMBER = '#F9A602';
const INK = '#191919';
const MUTED = '#6B7280';
const GREEN = '#10B981';

function MemberCard({
  member,
  busy,
  onRemove,
  onAssign,
}: {
  member: VendorMembership;
  busy: boolean;
  onRemove: () => void;
  onAssign?: () => void;
}) {
  const px = useScreenPx();
  const pending = member.status === 'PENDING';
  const [menuVisible, setMenuVisible] = useState(false);

  const name = member.driver?.name ?? 'Driver';
  const menuOptions: Array<{
    key: string;
    label: string;
    destructive?: boolean;
    onPress: () => void;
  }> = [];
  if (!pending && member.driver?.phone) {
    menuOptions.push({
      key: 'call',
      label: 'Call driver',
      onPress: () => {
        setMenuVisible(false);
        void Linking.openURL(`tel:${member.driver?.phone}`);
      },
    });
  }
  if (!pending && onAssign) {
    menuOptions.push({
      key: 'assign',
      label: 'Assign to job',
      onPress: () => {
        setMenuVisible(false);
        onAssign();
      },
    });
  }
  menuOptions.push({
    key: 'remove',
    label: pending ? 'Cancel invitation' : 'Remove from fleet',
    destructive: true,
    onPress: () => {
      setMenuVisible(false);
      onRemove();
    },
  });

  const openMenu = () => setMenuVisible(true);

  return (
    <View style={[styles.card, { borderRadius: px(16), padding: px(14), marginBottom: px(10) }]}>
      <View style={styles.row}>
        <View style={[styles.avatar, { width: px(44), height: px(44), borderRadius: px(14) }]}>
          <UserRound size={px(22)} color={AMBER} />
        </View>
        <View style={styles.grow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
            <PartnerText style={[styles.name, { fontSize: px(15) }]}>
              {member.driver?.name ?? 'Staff Driver'}
            </PartnerText>
            {member.driver?.driverCode ? (
              <View style={[styles.codeBadge, { paddingHorizontal: px(6), paddingVertical: px(2), borderRadius: px(6) }]}>
                <PartnerText style={{ color: '#2563EB', fontSize: px(10), fontWeight: '700' }}>
                  {member.driver.driverCode}
                </PartnerText>
              </View>
            ) : null}
          </View>
          <PartnerText style={[styles.sub, { fontSize: px(12), marginTop: px(2) }]}>
            {member.driver?.phone ?? 'Fleet Driver'}
          </PartnerText>
          {member.driver?.driverType ? (
            <PartnerText style={[styles.sub, { fontSize: px(11), marginTop: px(3), color: '#4B5563' }]}>
              {member.driver.driverType + (member.driver.city ? ' · ' + member.driver.city : '')}
            </PartnerText>
          ) : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: pending ? '#FFF4D6' : '#E9F8EF' }]}>
          <PartnerText style={{ color: pending ? '#9A6700' : '#13834C', fontSize: px(11), fontWeight: '700' }}>
            {pending ? 'Pending' : 'Active'}
          </PartnerText>
        </View>
        <Pressable
          onPress={openMenu}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Driver options"
          style={{ padding: px(4), marginLeft: px(4) }}>
          <MoreVertical size={px(20)} color={MUTED} strokeWidth={2.2} />
        </Pressable>
      </View>
      {!pending && onAssign ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy || member.driver?.isBusy}
          onPress={onAssign}
          style={[
            styles.primaryButton,
            {
              flexDirection: 'row',
              marginTop: px(12),
              height: px(42),
              borderRadius: px(11),
              backgroundColor: member.driver?.isBusy ? '#E5E7EB' : AMBER,
              opacity: busy ? 0.7 : 1,
            },
          ]}>
          <ClipboardList size={px(16)} color={INK} strokeWidth={2.3} />
          <PartnerText style={{ color: INK, fontSize: px(13), fontWeight: '700', marginLeft: px(6) }}>
            {member.driver?.isBusy ? 'On another job' : 'Assign to open job'}
          </PartnerText>
        </Pressable>
      ) : null}

      {/* Driver options action sheet (replaces system Alert menu) */}
      <Modal transparent animationType="fade" visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={memberMenuStyles.overlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={[memberMenuStyles.sheet, { paddingBottom: px(10) }]} onPress={e => e.stopPropagation()}>
            <View style={[memberMenuStyles.handle, { marginTop: px(10) }]} />
            <PartnerText style={[memberMenuStyles.title, { fontSize: px(15), marginTop: px(8) }]}>{name}</PartnerText>
            <PartnerText style={[memberMenuStyles.subtitle, { fontSize: px(12) }]}>
              {pending ? 'Pending fleet driver' : 'Fleet driver'}
            </PartnerText>
            {menuOptions.map(option => (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                onPress={option.onPress}
                style={({ pressed }) => [memberMenuStyles.option, pressed && memberMenuStyles.optionPressed]}>
                <PartnerText
                  style={[
                    memberMenuStyles.optionText,
                    { fontSize: px(14) },
                    option.destructive ? memberMenuStyles.optionDestructive : null,
                  ]}>
                  {option.label}
                </PartnerText>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setMenuVisible(false)}
              style={({ pressed }) => [memberMenuStyles.closeButton, pressed && memberMenuStyles.optionPressed]}>
              <PartnerText style={[memberMenuStyles.closeText, { fontSize: px(14) }]}>Close</PartnerText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const memberMenuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,18,25,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E4E8',
  },
  title: {
    fontWeight: '800',
    color: INK,
  },
  subtitle: {
    color: MUTED,
    marginTop: 2,
  },
  option: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
  },
  optionPressed: {
    backgroundColor: '#F8FAFC',
  },
  optionText: {
    fontWeight: '600',
    color: INK,
  },
  optionDestructive: {
    color: '#DC2626',
  },
  closeButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  closeText: {
    fontWeight: '700',
    color: MUTED,
  },
});

export default function VendorDriverMembershipsScreen() {
  const px = useScreenPx();
  const [showAddForm, setShowAddForm] = useState(false);
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [driverType, setDriverType] = useState<'Tow Driver' | 'Full-Time' | 'Part-Time'>('Tow Driver');
  const [city, setCity] = useState('Bhubaneswar');

  // Inline OTP state
  const [otpState, setOtpState] = useState<'IDLE' | 'SENDING' | 'SENT' | 'VERIFYING' | 'VERIFIED'>('IDLE');
  const [otpCode, setOtpCode] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [onboardingProofToken, setOnboardingProofToken] = useState<string | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { data: members = [], isLoading, isError, refetch, isRefetching } = useVendorMembershipsQuery();
  const revoke = useRevokeVendorDriverMembershipMutation();
  const { data: vendorBookings = [] } = useVendorBookingsQuery(true);

  // Resend OTP countdown timer
  useEffect(() => {
    if (otpSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setOtpSecondsLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpSecondsLeft]);

  const cleanPhone = useMemo(() => phone.replace(/\D/g, '').slice(-10), [phone]);

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setLicenseNo('');
    setDriverType('Tow Driver');
    setCity('Bhubaneswar');
    setOtpState('IDLE');
    setOtpCode('');
    setDevOtp(null);
    setOnboardingProofToken(null);
    setOtpSecondsLeft(0);
    setErrorMessage('');
    setShowAddForm(false);
  };

  const handleSendOtp = async () => {
    if (cleanPhone.length < 10) {
      setErrorMessage('Enter a valid 10-digit driver mobile number');
      return;
    }
    setErrorMessage('');
    setOtpState('SENDING');
    try {
      const res = await sendVendorDriverOnboardingOtp(cleanPhone, fullName);
      setOtpState('SENT');
      setOtpSecondsLeft(60);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
    } catch (err: unknown) {
      setOtpState('IDLE');
      setErrorMessage(err instanceof Error ? err.message : 'Could not send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 4) {
      setErrorMessage('Enter the OTP code received by the driver');
      return;
    }
    setErrorMessage('');
    setOtpState('VERIFYING');
    try {
      const res = await verifyVendorDriverOnboardingOtp(cleanPhone, otpCode);
      if (res.verified && (res.onboardingProofToken || res.proofToken)) {
        setOnboardingProofToken(res.onboardingProofToken || res.proofToken);
        setOtpState('VERIFIED');
      } else {
        setOtpState('SENT');
        setErrorMessage('Verification failed. Please re-enter the code.');
      }
    } catch (err: unknown) {
      setOtpState('SENT');
      setErrorMessage(err instanceof Error ? err.message : 'Invalid verification code');
    }
  };

  const handleSubmitStaffDriver = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Please enter driver’s full name');
      return;
    }
    if (cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!licenseNo.trim() || licenseNo.trim().length < 4) {
      setErrorMessage('Please enter a valid driving license number');
      return;
    }
    if (!onboardingProofToken) {
      setErrorMessage('Please verify the driver’s mobile number first');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      await createVendorStaffDriver({
        name: fullName.trim(),
        phone: cleanPhone,
        licenseNo: licenseNo.trim().toUpperCase(),
        driverType,
        city: city.trim() || 'Bhubaneswar',
        onboardingProofToken,
      });

      await refetch();
      showAlert({
        tone: 'success',
        title: 'Driver Added to Fleet! 🎉',
        message: `${fullName.trim()} has been registered directly into your fleet. They can now log in via mobile number and start working immediately without filling any registration forms!`,
        primaryAction: { label: 'Great!', onPress: resetForm },
      });
    } catch (err: unknown) {
      setSubmitting(false);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create staff driver');
    }
  };

  const openAssignForMember = (member: VendorMembership) => {
    const driverId = member.driver?.id;
    if (!driverId) return;
    const openJob = vendorBookings.find(
      b => (b.status === 'REQUESTED' || b.status === 'CONFIRMED') && !b.driver,
    );
    if (!openJob) {
      showAlert({
        tone: 'info',
        title: 'No open jobs',
        message: 'Go to Jobs → New leads and pick a customer request to assign this driver.',
        primaryAction: { label: 'Go to Jobs', onPress: () => jumpToPartnerJobsScreen('PartnerJobsList') },
        secondaryAction: { label: 'OK', onPress: () => {} },
      });
      return;
    }
    jumpToPartnerJobsScreen('VendorAssignJob', {
      bookingId: openJob.id,
      bookingType: openJob.bookingType,
      bookingNumber: openJob.bookingNumber,
      serviceLabel: openJob.serviceLabel,
      pickupAddress: openJob.pickup?.address,
      dropoffAddress: openJob.dropoff?.address ?? undefined,
      estimatedFare: openJob.estimatedFare,
      preferredDriverId: driverId,
    });
  };

  const confirmRemove = (member: VendorMembership) => {
    const isPending = member.status === 'PENDING';
    showAlert({
      tone: isPending ? 'warning' : 'error',
      title: isPending ? 'Cancel Invitation?' : 'Remove Driver?',
      message: isPending
        ? 'Withdraw the pending fleet invitation sent to this Driver?'
        : 'This ends ' + (member.driver?.name ?? 'this Driver') + '’s fleet connection.',
      primaryAction: {
        label: isPending ? 'Cancel Invitation' : 'Remove',
        onPress: () =>
          revoke.mutate(member.id, {
            onError: error =>
              showAlert({
                tone: 'error',
                title: isPending ? 'Could not cancel' : 'Could not remove Driver',
                message: error instanceof Error ? error.message : 'Please try again.',
              }),
          }),
      },
      secondaryAction: { label: 'Keep', onPress: () => {} },
    });
  };

  const activeMembers = members.filter(m => m.status === 'ACTIVE');
  const pendingMembers = members.filter(m => m.status === 'PENDING');

  return (
    <View style={{ flex: 1 }}>
    <AppScreenLayout
      header={
        <View style={[styles.header, { paddingHorizontal: px(18), paddingTop: px(14), paddingBottom: px(12) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <PartnerText style={[styles.title, { fontSize: px(22) }]}>Fleet Drivers</PartnerText>
              <PartnerText style={[styles.subtitle, { fontSize: px(12.5) }]}>
                {activeMembers.length} active driver{activeMembers.length === 1 ? '' : 's'} in your fleet
              </PartnerText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add staff driver"
              onPress={() => setShowAddForm(prev => !prev)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(5),
                height: px(38),
                paddingHorizontal: px(14),
                borderRadius: px(19),
                backgroundColor: showAddForm ? '#1F2937' : AMBER,
                opacity: pressed ? 0.88 : 1,
              })}>
              {showAddForm ? (
                <>
                  <X size={px(15)} color="#FFFFFF" strokeWidth={2.4} />
                  <PartnerText style={{ color: '#FFFFFF', fontSize: px(13), fontWeight: '700' }}>
                    Cancel
                  </PartnerText>
                </>
              ) : (
                <>
                  <UserRoundPlus size={px(16)} color={INK} strokeWidth={2.4} />
                  <PartnerText style={{ color: INK, fontSize: px(13), fontWeight: '700' }}>
                    + Add Driver
                  </PartnerText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      }
      refreshing={isRefetching}
      onRefresh={() => {
        void refetch();
      }}
      contentStyle={{ paddingTop: px(12) }}>
      {/* Direct Staff Onboarding Card */}
      {showAddForm ? (
        <View style={[styles.formCard, { borderRadius: px(18), padding: px(16), marginBottom: px(18) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: px(12) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
              <View style={[styles.avatar, { width: px(36), height: px(36), borderRadius: px(12), backgroundColor: '#EFF6FF' }]}>
                <Sparkles size={px(18)} color="#2563EB" />
              </View>
              <View>
                <PartnerText style={{ color: INK, fontSize: px(15), fontWeight: '800' }}>
                  Onboard Staff Driver
                </PartnerText>
                <PartnerText style={{ color: MUTED, fontSize: px(11) }}>
                  Inline OTP verification · Instant fleet activation
                </PartnerText>
              </View>
            </View>
          </View>

          {errorMessage ? (
            <View style={[styles.errorBanner, { padding: px(10), borderRadius: px(10), marginBottom: px(12) }]}>
              <PartnerText style={{ color: '#DC2626', fontSize: px(12), fontWeight: '600' }}>
                {errorMessage}
              </PartnerText>
            </View>
          ) : null}

          {/* Full Name */}
          <View style={{ marginBottom: px(12) }}>
            <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>Driver Full Name *</PartnerText>
            <View style={[styles.textInputWrap, { borderRadius: px(12), height: px(46) }]}>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, { fontSize: px(14) }]}
              />
            </View>
          </View>

          {/* Mobile Number & Inline OTP */}
          <View style={{ marginBottom: px(12) }}>
            <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>Driver Mobile Number *</PartnerText>
            <View style={[styles.phoneInputRow, { borderRadius: px(12), height: px(46) }]}>
              <PartnerText style={{ color: INK, fontSize: px(14), fontWeight: '700' }}>+91</PartnerText>
              <TextInput
                value={phone}
                onChangeText={val => {
                  setPhone(val.replace(/\D/g, '').slice(0, 10));
                  if (otpState === 'VERIFIED') {
                    setOtpState('IDLE');
                    setOnboardingProofToken(null);
                  }
                }}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="10-digit mobile number"
                placeholderTextColor="#9CA3AF"
                editable={otpState !== 'VERIFIED'}
                style={[styles.input, { fontSize: px(14) }]}
              />
              {otpState === 'IDLE' && cleanPhone.length === 10 ? (
                <Pressable
                  onPress={handleSendOtp}
                  style={[styles.smallActionBtn, { paddingHorizontal: px(10), paddingVertical: px(6), borderRadius: px(8) }]}>
                  <PartnerText style={{ color: '#FFFFFF', fontSize: px(12), fontWeight: '700' }}>
                    Send Code
                  </PartnerText>
                </Pressable>
              ) : null}
            </View>

            {/* Inline OTP Widget */}
            {otpState === 'SENDING' ? (
              <View style={[styles.inlineOtpBox, { padding: px(12), borderRadius: px(12), marginTop: px(8) }]}>
                <ActivityIndicator size="small" color={AMBER} />
                <PartnerText style={{ color: MUTED, fontSize: px(12), marginLeft: px(8) }}>
                  Sending verification SMS code to +91 {cleanPhone}...
                </PartnerText>
              </View>
            ) : null}

            {otpState === 'SENT' || otpState === 'VERIFYING' ? (
              <View style={[styles.inlineOtpBox, { padding: px(12), borderRadius: px(12), marginTop: px(8) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: px(8) }}>
                  <PartnerText style={{ color: INK, fontSize: px(12.5), fontWeight: '700' }}>
                    Enter 6-digit Code sent to +91 {cleanPhone}
                  </PartnerText>
                  {otpSecondsLeft > 0 ? (
                    <PartnerText style={{ color: MUTED, fontSize: px(11) }}>
                      Resend in {otpSecondsLeft}s
                    </PartnerText>
                  ) : (
                    <Pressable onPress={handleSendOtp}>
                      <PartnerText style={{ color: '#2563EB', fontSize: px(11.5), fontWeight: '700' }}>
                        Resend Code
                      </PartnerText>
                    </Pressable>
                  )}
                </View>

                {devOtp ? (
                  <Pressable
                    onPress={() => setOtpCode(devOtp)}
                    style={[styles.devOtpChip, { paddingHorizontal: px(8), paddingVertical: px(4), borderRadius: px(6), marginBottom: px(8) }]}>
                    <PartnerText style={{ color: '#1E40AF', fontSize: px(11), fontWeight: '700' }}>
                      ⚡ Dev Auto-Fill Code: {devOtp} (tap to paste)
                    </PartnerText>
                  </Pressable>
                ) : null}

                <View style={{ flexDirection: 'row', gap: px(8), alignItems: 'center' }}>
                  <TextInput
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="6-digit code"
                    placeholderTextColor="#9CA3AF"
                    style={[styles.otpInput, { flex: 1, height: px(42), borderRadius: px(10), fontSize: px(16) }]}
                  />
                  <Pressable
                    disabled={otpCode.length < 4 || otpState === 'VERIFYING'}
                    onPress={handleVerifyOtp}
                    style={[
                      styles.verifyBtn,
                      {
                        height: px(42),
                        paddingHorizontal: px(16),
                        borderRadius: px(10),
                        opacity: otpCode.length >= 4 ? 1 : 0.6,
                      },
                    ]}>
                    {otpState === 'VERIFYING' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <PartnerText style={{ color: '#FFFFFF', fontSize: px(13), fontWeight: '700' }}>
                        Verify
                      </PartnerText>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}

            {otpState === 'VERIFIED' ? (
              <View style={[styles.verifiedBanner, { padding: px(10), borderRadius: px(10), marginTop: px(8) }]}>
                <CheckCircle2 size={px(18)} color="#059669" />
                <PartnerText style={{ color: '#065F46', fontSize: px(12.5), fontWeight: '700', marginLeft: px(6) }}>
                  Mobile Verified (+91 {cleanPhone}) ✓
                </PartnerText>
              </View>
            ) : null}
          </View>

          {/* License Number */}
          <View style={{ marginBottom: px(12) }}>
            <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>Driving License Number *</PartnerText>
            <View style={[styles.textInputWrap, { borderRadius: px(12), height: px(46) }]}>
              <TextInput
                value={licenseNo}
                onChangeText={val => setLicenseNo(val.toUpperCase())}
                placeholder="e.g. OD02 20230012345"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                style={[styles.input, { fontSize: px(14) }]}
              />
            </View>
          </View>

          {/* Driver Type Picker */}
          <View style={{ marginBottom: px(16) }}>
            <PartnerText style={[styles.inputLabel, { fontSize: px(12) }]}>Fleet Role / Driver Type *</PartnerText>
            <View style={{ flexDirection: 'row', gap: px(8) }}>
              {(['Tow Driver', 'Full-Time', 'Part-Time'] as const).map(type => {
                const selected = driverType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setDriverType(type)}
                    style={[
                      styles.typePill,
                      {
                        flex: 1,
                        paddingVertical: px(9),
                        borderRadius: px(10),
                        backgroundColor: selected ? AMBER : '#F3F4F6',
                        borderColor: selected ? AMBER : '#E5E7EB',
                      },
                    ]}>
                    <PartnerText
                      style={{
                        textAlign: 'center',
                        fontSize: px(12),
                        fontWeight: selected ? '800' : '600',
                        color: selected ? INK : '#4B5563',
                      }}>
                      {type}
                    </PartnerText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Submit Action */}
          <Pressable
            disabled={submitting || !onboardingProofToken || !fullName.trim() || !licenseNo.trim()}
            onPress={handleSubmitStaffDriver}
            style={[
              styles.primaryButton,
              {
                height: px(48),
                borderRadius: px(12),
                backgroundColor: onboardingProofToken && fullName.trim() && licenseNo.trim() ? AMBER : '#E5E7EB',
                opacity: submitting ? 0.7 : 1,
              },
            ]}>
            {submitting ? (
              <ActivityIndicator color={INK} />
            ) : (
              <>
                <UserCheck size={px(18)} color={INK} strokeWidth={2.4} />
                <PartnerText style={{ color: INK, fontSize: px(14), fontWeight: '800', marginLeft: px(8) }}>
                  Add Driver to Fleet
                </PartnerText>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      {/* Pending Drivers Section if any */}
      {pendingMembers.length > 0 ? (
        <View style={{ marginBottom: px(16) }}>
          <PartnerText style={[styles.sectionTitle, { fontSize: px(15), marginBottom: px(8) }]}>
            Pending Review Drivers · {pendingMembers.length}
          </PartnerText>
          {pendingMembers.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              busy={revoke.isPending}
              onRemove={() => confirmRemove(member)}
            />
          ))}
        </View>
      ) : null}

      {/* Active Fleet Drivers List */}
      <PartnerText style={[styles.sectionTitle, { fontSize: px(15), marginBottom: px(10) }]}>
        Connected Fleet Drivers · {activeMembers.length}
      </PartnerText>

      {isLoading ? (
        <View style={{ paddingVertical: px(30) }}>
          <ActivityIndicator color={AMBER} />
        </View>
      ) : isError ? (
        <View style={[styles.empty, { padding: px(18), borderRadius: px(15) }]}>
          <PartnerText style={{ color: MUTED, textAlign: 'center', fontSize: px(13) }}>
            Fleet list could not load. Pull down to retry.
          </PartnerText>
        </View>
      ) : activeMembers.length ? (
        activeMembers.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            busy={revoke.isPending}
            onRemove={() => confirmRemove(member)}
            onAssign={() => openAssignForMember(member)}
          />
        ))
      ) : (
        <View style={[styles.empty, { padding: px(24), borderRadius: px(16) }]}>
          <View style={[styles.avatar, { width: px(50), height: px(50), borderRadius: px(16), marginBottom: px(10) }]}>
            <UserRoundPlus size={px(24)} color={AMBER} />
          </View>
          <PartnerText style={{ color: INK, fontWeight: '800', fontSize: px(15) }}>
            No Drivers in your fleet yet
          </PartnerText>
          <PartnerText style={{ color: MUTED, fontSize: px(12.5), textAlign: 'center', marginTop: px(5), lineHeight: px(18) }}>
            Tap <PartnerText style={{ fontWeight: '700', color: INK }}>+ Add Driver</PartnerText> above to directly onboard staff drivers with verified phone OTP into your fleet.
          </PartnerText>
        </View>
      )}
    </AppScreenLayout>
    {partnerDialog}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  title: { color: INK, fontWeight: '800' },
  subtitle: { color: MUTED, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7E5' },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  name: { color: INK, fontWeight: '700' },
  sub: { color: MUTED, marginTop: 1 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  codeBadge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  sectionTitle: { color: INK, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EAEC' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inputLabel: {
    color: INK,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    color: INK,
    paddingVertical: 0,
    minWidth: 0,
  },
  smallActionBtn: {
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineOtpBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  devOtpChip: {
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-start',
  },
  otpInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    textAlign: 'center',
    fontWeight: '700',
    color: INK,
    letterSpacing: 4,
  },
  verifyBtn: {
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  typePill: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
});
