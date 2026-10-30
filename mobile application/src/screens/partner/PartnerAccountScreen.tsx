import { PartnerText } from '../../components/partner/PartnerText';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Truck,
  FileText,
  CreditCard,
  DollarSign,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  CheckCircle,
  Users,
  Building,
  Edit2,
  AlertCircle,
  MapPin,
  Info,
} from 'lucide-react-native';

import { useAuthActions } from '../../hooks/useAuth';
import { usePartnerDialog } from '../../hooks/usePartnerDialog';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { usePartnerOnboardingStore } from '../../store/partnerOnboardingStore';
import { useDriverProfileQuery } from '../../services/driver/useDriverQueries';
import DriverDataSkeleton from '../../components/partner/DriverDataSkeleton';
import { useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import { switchMockRole } from '../../config/uiPreviewMode';
import { UI_PREVIEW_MUTATIONS_ENABLED } from '../../constants/preview';
import { usePartnerPayoutStore } from '../../store/partnerPayoutStore';
import type { PartnerAccountStackParamList } from '../../types/partnerNavigation';
import { driverColors, driverRadius, getPressableFeedback } from '../../theme/driverUi';
import { buildDriverVerification } from '../../utils/driverVerification';
import PartnerLogoutDialog from '../../components/partner/dialogs/PartnerLogoutDialog';
import PartnerLocationSheet from '../../components/partner/dialogs/PartnerLocationSheet';
import { useNotificationsQuery } from '../../services/useNotificationQueries';
import { openLocationSettings } from '../../hooks/useDriverLocationReporting';
import { openDriverJobsDone } from '../../navigation/partnerNavigationRef';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerAccountMain'>;

export default function PartnerAccountScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { logout } = useAuthActions();
  const { dialog: partnerDialog, showAlert } = usePartnerDialog();

  const user = useAppSelector(state => state.auth.user);
  const isVendor = user?.role === 'vendor';
  const isDriver = user?.role === 'driver';

  const { data: driverProfile, isLoading: driverProfileLoading } = useDriverProfileQuery(isDriver);
  const { data: vendor } = useVendorStatusQuery(isVendor);
  const { data: notifData } = useNotificationsQuery();

  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const avatarUri = usePartnerPayoutStore(state => state.avatarUri);

  const unreadNotifs = notifData?.unreadCount ?? 0;
  const driverVerification = buildDriverVerification(driverProfile);
  const accountApproved = isVendor
    ? vendor?.status === 'approved'
    : driverVerification.isApproved;
  const accountStatusLabel = isVendor
    ? vendor?.status === 'approved'
      ? 'Approved'
      : 'In review'
    : driverVerification.badge;
  const driverDocuments = driverProfile?.driverProfile?.documents ?? [];
  const verifiedDriverDocuments = driverDocuments.filter(doc => doc.status === 'VERIFIED').length;

  const performLogout = async () => {
    try {
      setLoggingOut(true);
      usePartnerOnboardingStore.getState().clearSelectedRole();
      await logout();
    } catch {
      showAlert({ tone: 'error', title: 'Logout failed', message: 'Please try again.' });
    } finally {
      setLoggingOut(false);
      setLogoutVisible(false);
    }
  };

  const displayName = isVendor
    ? vendor?.businessName || user?.fullName || 'Your business'
    : driverProfile?.fullName || user?.fullName || 'Partner';

  const isVendorStaffDriver =
    isDriver &&
    (driverProfile?.driverContext === 'VENDOR_MANAGED' ||
      Boolean(driverProfile?.vendorUserId) ||
      Boolean(driverProfile?.driverProfile?.vendorUserId) ||
      driverProfile?.driverProfile?.fleetSource === 'vendor');

  const roleLabel = isVendor
    ? 'Vendor partner'
    : isVendorStaffDriver
      ? 'Vendor driver'
      : 'Independent driver';

  const profilePhotoUri =
    avatarUri ||
    driverProfile?.profilePhoto ||
    null;

  const partnerCode = isVendor
    ? vendor?.id
      ? `ID: ${vendor.id.slice(0, 8).toUpperCase()}`
      : 'Vendor ID pending'
    : driverProfile?.driverProfile?.driverCode
      ? `ID: ${driverProfile.driverProfile.driverCode}`
      : 'Driver ID pending';

  const handleAllowLocation = () => {
    setLocationSheetVisible(false);
    void openLocationSettings();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={driverColors.pageBg} />

      {/* Header Pad */}
      <View style={[styles.headerPad, { paddingTop: insets.top + 8 }]}>
        <PartnerText style={styles.headerTitle}>Profile</PartnerText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}>
        {isDriver && driverProfileLoading && !driverProfile ? (
          <DriverDataSkeleton variant="profile" />
        ) : (
          <>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                {profilePhotoUri ? (
                  <Image source={{ uri: profilePhotoUri }} style={styles.avatarImage} />
                ) : (
                  <PartnerText style={styles.avatarInitials}>
                    {displayName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || 'OS'}
                  </PartnerText>
                )}
              </View>
            </View>

            <View style={styles.profileInfoCol}>
              <View style={styles.nameRow}>
                <PartnerText style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
                  {displayName}
                </PartnerText>
                <Pressable
                  hitSlop={8}
                  style={styles.editBtnPill}
                  onPress={() => navigation.navigate('PartnerEditProfile')}>
                  <Edit2 size={11} color="#92400E" strokeWidth={2.4} />
                  <PartnerText style={styles.editBtnText}>Edit</PartnerText>
                </Pressable>
              </View>

              <View style={styles.roleRow}>
                <View style={styles.rolePill}>
                  <PartnerText style={styles.roleText}>{roleLabel}</PartnerText>
                </View>
                <View style={accountApproved ? styles.verifiedPill : styles.reviewPill}>
                  {accountApproved ? (
                    <CheckCircle size={11} color={driverColors.green} strokeWidth={2.4} />
                  ) : (
                    <AlertCircle size={11} color={driverColors.amberText} strokeWidth={2.4} />
                  )}
                  <PartnerText style={accountApproved ? styles.verifiedText : styles.reviewText}>
                    {accountStatusLabel}
                  </PartnerText>
                </View>
              </View>

              <PartnerText style={styles.partnerId} numberOfLines={1} ellipsizeMode="middle">
                {partnerCode}
              </PartnerText>
            </View>
          </View>

          {/* Metric Bar */}
          {!isVendor ? (
            <View style={styles.metricRow}>
              <View style={styles.metricCol}>
                <PartnerText style={styles.metricValue} numberOfLines={1}>
                  {accountStatusLabel}
                </PartnerText>
                <PartnerText style={styles.metricSubtitle}>Account</PartnerText>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricCol}>
                <PartnerText style={styles.metricValue} numberOfLines={1}>
                  {driverProfile?.driverProfile?.driverType || 'Tow driver'}
                </PartnerText>
                <PartnerText style={styles.metricSubtitle}>Driver type</PartnerText>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricCol}>
                <PartnerText style={styles.metricValue} numberOfLines={1}>
                  {driverProfile?.driverProfile?.city ||
                    driverProfile?.address?.city ||
                    driverVerification.application.city ||
                    '—'}
                </PartnerText>
                <PartnerText style={styles.metricSubtitle}>City</PartnerText>
              </View>
            </View>
          ) : (
            <View style={styles.metricRow}>
              <View style={styles.metricCol}>
                <PartnerText style={styles.metricValue}>{vendor?.status ? 'Active' : 'Approved'}</PartnerText>
                <PartnerText style={styles.metricSubtitle}>Fleet Status</PartnerText>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricCol}>
                <PartnerText style={styles.metricValue}>Towing</PartnerText>
                <PartnerText style={styles.metricSubtitle}>Business Type</PartnerText>
              </View>
            </View>
          )}
        </View>

        {/* Section 1: Account Operations & Fleet */}
        <PartnerText style={styles.sectionHeader}>{isVendor ? 'Vendor Operations' : 'Account Operations'}</PartnerText>
        <View style={styles.menuCard}>
          {!isVendor ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('PartnerEditProfile')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                  <User size={18} color="#0284C7" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <PartnerText style={styles.menuTitle}>Personal Information</PartnerText>
                  <PartnerText style={styles.menuSubtitle}>View and edit your details</PartnerText>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('PartnerDocuments')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <FileText size={18} color="#059669" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <PartnerText style={styles.menuTitle}>Documents</PartnerText>
                  <PartnerText style={styles.menuSubtitle}>
                    {driverDocuments.length > 0
                      ? `${verifiedDriverDocuments}/${driverDocuments.length} verified`
                      : 'Verification status unavailable'}
                  </PartnerText>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('PartnerBankDetails')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#F5F3FF' }]}>
                  <CreditCard size={18} color="#7C3AED" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <PartnerText style={styles.menuTitle}>Bank & Payouts</PartnerText>
                  <PartnerText style={styles.menuSubtitle}>Add or manage bank details</PartnerText>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('PartnerEarnings')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#FFFBEB' }]}>
                  <DollarSign size={18} color="#D97706" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <PartnerText style={styles.menuTitle}>Earnings & payouts</PartnerText>
                  <PartnerText style={styles.menuSubtitle}>Weekly earnings and payout status</PartnerText>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>

              <View style={styles.divider} />


              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('PartnerNotifications')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Bell size={18} color="#2563EB" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <PartnerText style={styles.menuTitle}>Notifications</PartnerText>
                  <PartnerText style={styles.menuSubtitle}>
                    {unreadNotifs > 0 ? `${unreadNotifs} unread updates` : 'Job requests and alerts'}
                  </PartnerText>
                </View>
                {unreadNotifs > 0 ? (
                  <View style={styles.unreadCounter}>
                    <PartnerText style={styles.unreadCounterText}>{unreadNotifs}</PartnerText>
                  </View>
                ) : null}
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>
            </>
          ) : (
            /* Vendor specific items */
            <>
              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('VendorDrivers')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                  <Users size={18} color="#0284C7" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <PartnerText style={styles.menuTitle}>Vendor Drivers</PartnerText>
                  <PartnerText style={styles.menuSubtitle}>Manage and assign drivers</PartnerText>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('VendorVehicles')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#FFF7ED' }]}>
                  <Truck size={18} color="#EA580C" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <PartnerText style={styles.menuTitle}>Vendor Vehicles</PartnerText>
                  <PartnerText style={styles.menuSubtitle}>Manage tow trucks & fleet</PartnerText>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('VendorVerificationStatus')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Building size={18} color="#059669" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <PartnerText style={styles.menuTitle}>Verification Status</PartnerText>
                  <PartnerText style={styles.menuSubtitle}>Business compliance & docs</PartnerText>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('PartnerBankDetails')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#F5F3FF' }]}>
                  <CreditCard size={18} color="#7C3AED" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <PartnerText style={styles.menuTitle}>Bank & Payouts</PartnerText>
                  <PartnerText style={styles.menuSubtitle}>Manage business payouts</PartnerText>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('PartnerNotifications')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Bell size={18} color="#2563EB" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <PartnerText style={styles.menuTitle}>Notifications</PartnerText>
                  <PartnerText style={styles.menuSubtitle}>Leads and system notices</PartnerText>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>
            </>
          )}
        </View>

        {/* Section 2: Preferences */}
        <PartnerText style={styles.sectionHeader}>Preferences</PartnerText>
        <View style={styles.menuCard}>
          <Pressable
            style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
            onPress={() => setLocationSheetVisible(true)}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <MapPin size={18} color="#059669" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextCol}>
              <PartnerText style={styles.menuTitle}>Location Settings</PartnerText>
              <PartnerText style={styles.menuSubtitle}>Manage GPS & location permissions</PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Section 3: Support & About */}
        <PartnerText style={styles.sectionHeader}>Support & About</PartnerText>
        <View style={styles.menuCard}>
          <Pressable
            style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
            onPress={() => navigation.navigate('PartnerHelpSupport')}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FEF2F2' }]}>
              <HelpCircle size={18} color="#DC2626" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextCol}>
              <PartnerText style={styles.menuTitle}>Help & Support</PartnerText>
              <PartnerText style={styles.menuSubtitle}>FAQs and contact support</PartnerText>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.menuRow}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <Info size={18} color="#64748B" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextCol}>
              <PartnerText style={styles.menuTitle}>App Version</PartnerText>
              <PartnerText style={styles.menuSubtitle}>RACE Partner v1.0.0 (Production Build)</PartnerText>
            </View>
          </View>
        </View>

        {/* Development Mode Role Switcher (gated to preview mode) */}
        {UI_PREVIEW_MUTATIONS_ENABLED ? (
          <Pressable
            style={({ pressed }) => [
              styles.switchRoleButton,
              getPressableFeedback(pressed),
            ]}
            onPress={() => void switchMockRole(dispatch, isDriver ? 'vendor' : 'driver')}>
            <PartnerText style={styles.switchRoleText}>
              {isDriver ? '⚡ Switch to Vendor Preview' : '⚡ Switch to Driver Preview'}
            </PartnerText>
          </Pressable>
        ) : null}

        {/* Logout Button */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            getPressableFeedback(pressed),
          ]}
          onPress={() => setLogoutVisible(true)}>
          <LogOut size={16} color={driverColors.red} strokeWidth={2.4} />
          <PartnerText style={styles.logoutText}>Log out</PartnerText>
        </Pressable>
          </>
        )}
      </ScrollView>

      {/* Supporting Dialogs & Sheets */}
      <PartnerLogoutDialog
        visible={logoutVisible}
        isLoading={loggingOut}
        onCancel={() => setLogoutVisible(false)}
        onConfirm={performLogout}
      />

      <PartnerLocationSheet
        visible={locationSheetVisible}
        onAllow={handleAllowLocation}
        onDeny={() => setLocationSheetVisible(false)}
      />
      {partnerDialog}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: driverColors.pageBg,
  },
  headerPad: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: driverColors.hairline,
    backgroundColor: driverColors.pageBg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: driverColors.ink,
    letterSpacing: -0.2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  profileCard: {
    backgroundColor: driverColors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 0.5,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '700',
    color: '#92400E',
  },
  profileInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  profileName: {
    fontSize: 16.5,
    fontWeight: '700',
    color: driverColors.ink,
    flex: 1,
    minWidth: 0,
  },
  editBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginLeft: 8,
    flexShrink: 0,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 3,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
    marginBottom: 3,
  },
  rolePill: {
    backgroundColor: driverColors.light,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: driverRadius.pill,
  },
  roleText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: driverColors.grey,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: driverColors.greenPill,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: driverRadius.pill,
  },
  verifiedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: driverColors.green,
  },
  reviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: driverColors.amberTile,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: driverRadius.pill,
  },
  reviewText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: driverColors.amberText,
  },
  partnerId: {
    fontSize: 11,
    fontWeight: '600',
    color: driverColors.greySoft,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    width: '100%',
  },
  metricCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.ink,
    textAlign: 'center',
  },
  metricSubtitle: {
    fontSize: 10.5,
    color: driverColors.grey,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E4E8',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: driverColors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: driverColors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 0.5,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.ink,
  },
  menuSubtitle: {
    fontSize: 12,
    color: driverColors.grey,
    marginTop: 2,
  },
  badgeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approvedPill: {
    backgroundColor: driverColors.greenPill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  approvedText: {
    fontSize: 11,
    fontWeight: '700',
    color: driverColors.green,
  },
  unreadCounter: {
    backgroundColor: '#0057FD',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  unreadCounterText: {
    fontSize: 11,
    fontWeight: '800',
    color: driverColors.white,
  },
  divider: {
    height: 1,
    backgroundColor: driverColors.hairline,
    marginLeft: 68,
  },
  switchRoleButton: {
    height: 44,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.white,
    borderWidth: 1,
    borderColor: driverColors.amberBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  switchRoleText: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.amberText,
  },
  logoutButton: {
    height: 44,
    borderRadius: driverRadius.button,
    backgroundColor: driverColors.white,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.red,
  },
});
