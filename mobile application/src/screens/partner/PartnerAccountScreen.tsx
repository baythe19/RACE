import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  Globe,
  Info,
  Settings,
} from 'lucide-react-native';

import { useAuthActions } from '../../hooks/useAuth';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { usePartnerOnboardingStore } from '../../store/partnerOnboardingStore';
import { useDriverProfileQuery } from '../../services/driver/useDriverQueries';
import { useVendorStatusQuery } from '../../services/vendor/useVendorMutations';
import { UI_PREVIEW_MODE, switchMockRole } from '../../config/uiPreviewMode';
import type { PartnerAccountStackParamList } from '../../types/partnerNavigation';
import { driverColors, driverRadius, getPressableFeedback } from '../../theme/driverUi';
import { buildDriverVerification } from '../../utils/driverVerification';
import PartnerLogoutDialog from '../../components/partner/dialogs/PartnerLogoutDialog';
import PartnerLanguageSheet from '../../components/partner/dialogs/PartnerLanguageSheet';
import PartnerLocationSheet from '../../components/partner/dialogs/PartnerLocationSheet';
import PartnerNotificationPreferencesModal from '../../components/partner/dialogs/PartnerNotificationPreferencesModal';
import { useNotificationsQuery } from '../../services/useNotificationQueries';
import { openLocationSettings } from '../../hooks/useDriverLocationReporting';

type Props = NativeStackScreenProps<PartnerAccountStackParamList, 'PartnerAccountMain'>;

export default function PartnerAccountScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { logout } = useAuthActions();

  const user = useAppSelector(state => state.auth.user);
  const isVendor = user?.role === 'vendor';
  const isDriver = user?.role === 'driver';

  const { data: driverProfile } = useDriverProfileQuery(isDriver);
  const { data: vendor } = useVendorStatusQuery(isVendor);
  const { data: notifData } = useNotificationsQuery();

  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [langSheetVisible, setLangSheetVisible] = useState(false);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [notifPrefsVisible, setNotifPrefsVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');

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
      Alert.alert('Logout failed', 'Please try again.');
    } finally {
      setLoggingOut(false);
      setLogoutVisible(false);
    }
  };

  const displayName = isVendor
    ? vendor?.businessName || user?.fullName || 'Kalinga Towing'
    : driverProfile?.fullName || user?.fullName || 'Om Singh';

  const partnerCode = isVendor
    ? `ID: ${vendor?.id?.slice(0, 8).toUpperCase() || 'VND-2001'}`
    : `ID: ${driverProfile?.driverProfile?.driverCode || 'DRV-1024'}`;

  const roleLabel = isVendor ? 'Vendor Partner' : 'Self Driver';

  const handleAllowLocation = () => {
    setLocationSheetVisible(false);
    void openLocationSettings();
  };

  const languageDisplayName =
    selectedLang === 'hi' ? 'हिंदी' : selectedLang === 'or' ? 'ଓଡ଼ିଆ' : 'English';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={driverColors.pageBg} />

      {/* Header Pad */}
      <View style={[styles.headerPad, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {displayName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'OS'}
              </Text>
            </View>
            <Pressable
              style={styles.editAvatarBadge}
              onPress={() => navigation.navigate('PartnerEditProfile')}>
              <Edit2 size={12} color={driverColors.ink} strokeWidth={2.4} />
            </Pressable>
          </View>

          <Text style={styles.profileName}>{displayName}</Text>

          <View style={styles.roleRow}>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
            <View style={accountApproved ? styles.verifiedPill : styles.reviewPill}>
              {accountApproved ? (
                <CheckCircle size={12} color={driverColors.green} strokeWidth={2.4} />
              ) : (
                <AlertCircle size={12} color={driverColors.amberText} strokeWidth={2.4} />
              )}
              <Text style={accountApproved ? styles.verifiedText : styles.reviewText}>
                {accountStatusLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.partnerId}>{partnerCode}</Text>

          {/* Only show values that come from the profile; do not invent driver KPIs. */}
          {!isVendor ? (
            <View style={styles.metricRow}>
              <View style={styles.metricCol}>
                <Text style={styles.metricValue}>{accountStatusLabel}</Text>
                <Text style={styles.metricSubtitle}>Account status</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricCol}>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {driverProfile?.driverProfile?.driverType || '—'}
                </Text>
                <Text style={styles.metricSubtitle}>Driver type</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricCol}>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {driverProfile?.driverProfile?.city || '—'}
                </Text>
                <Text style={styles.metricSubtitle}>Operating city</Text>
              </View>
            </View>
          ) : (
            <View style={styles.metricRow}>
              <View style={styles.metricCol}>
                <Text style={styles.metricValue}>{vendor?.status ? 'Active' : 'Approved'}</Text>
                <Text style={styles.metricSubtitle}>Fleet Status</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricCol}>
                <Text style={styles.metricValue}>Towing</Text>
                <Text style={styles.metricSubtitle}>Business Type</Text>
              </View>
            </View>
          )}
        </View>

        {/* Section 1: Account Operations & Fleet */}
        <Text style={styles.sectionHeader}>{isVendor ? 'Vendor Operations' : 'Account & Vehicle'}</Text>
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
                  <Text style={styles.menuTitle}>Personal Information</Text>
                  <Text style={styles.menuSubtitle}>View and edit your details</Text>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
                onPress={() => navigation.navigate('PartnerVehicleInfo')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#FFF7ED' }]}>
                  <Truck size={18} color="#EA580C" strokeWidth={2.2} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuTitle}>Vehicle Information</Text>
                  <Text style={styles.menuSubtitle}>
                    {driverProfile?.driverProfile?.vehicleRegistration ||
                      driverProfile?.driverProfile?.driverType ||
                      'Vehicle details not added'}
                  </Text>
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
                  <Text style={styles.menuTitle}>Documents</Text>
                  <Text style={styles.menuSubtitle}>
                    {driverDocuments.length > 0
                      ? `${verifiedDriverDocuments}/${driverDocuments.length} verified`
                      : 'Verification status unavailable'}
                  </Text>
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
                  <Text style={styles.menuTitle}>Bank & Payouts</Text>
                  <Text style={styles.menuSubtitle}>Add or manage bank details</Text>
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
                  <Text style={styles.menuTitle}>Earnings & History</Text>
                  <Text style={styles.menuSubtitle}>Track earnings and payouts</Text>
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
                  <Text style={styles.menuTitle}>Notifications</Text>
                  <Text style={styles.menuSubtitle}>
                    {unreadNotifs > 0 ? `${unreadNotifs} unread updates` : 'Job requests and alerts'}
                  </Text>
                </View>
                {unreadNotifs > 0 ? (
                  <View style={styles.unreadCounter}>
                    <Text style={styles.unreadCounterText}>{unreadNotifs}</Text>
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
                  <Text style={styles.menuTitle}>Vendor Drivers</Text>
                  <Text style={styles.menuSubtitle}>Manage and assign drivers</Text>
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
                  <Text style={styles.menuTitle}>Vendor Vehicles</Text>
                  <Text style={styles.menuSubtitle}>Manage tow trucks & fleet</Text>
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
                  <Text style={styles.menuTitle}>Verification Status</Text>
                  <Text style={styles.menuSubtitle}>Business compliance & docs</Text>
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
                  <Text style={styles.menuTitle}>Bank & Payouts</Text>
                  <Text style={styles.menuSubtitle}>Manage business payouts</Text>
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
                  <Text style={styles.menuTitle}>Notifications</Text>
                  <Text style={styles.menuSubtitle}>Leads and system notices</Text>
                </View>
                <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
              </Pressable>
            </>
          )}
        </View>

        {/* Section 2: Preferences (Location, Language, Notifications - moved directly into Profile) */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.menuCard}>
          <Pressable
            style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
            onPress={() => setLocationSheetVisible(true)}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <MapPin size={18} color="#059669" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Location Settings</Text>
              <Text style={styles.menuSubtitle}>Manage GPS & location permissions</Text>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
            onPress={() => setLangSheetVisible(true)}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Globe size={18} color="#2563EB" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Language</Text>
              <Text style={styles.menuSubtitle}>{languageDisplayName}</Text>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
            onPress={() => setNotifPrefsVisible(true)}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Bell size={18} color="#EA580C" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Notification Preferences</Text>
              <Text style={styles.menuSubtitle}>Sound alerts, trip requests & reminders</Text>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Section 3: Support & About */}
        <Text style={styles.sectionHeader}>Support & About</Text>
        <View style={styles.menuCard}>
          <Pressable
            style={({ pressed }) => [styles.menuRow, getPressableFeedback(pressed)]}
            onPress={() => navigation.navigate('PartnerHelpSupport')}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FEF2F2' }]}>
              <HelpCircle size={18} color="#DC2626" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Help & Support</Text>
              <Text style={styles.menuSubtitle}>FAQs and contact support</Text>
            </View>
            <ChevronRight size={18} color="#C4C7D0" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.menuRow}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <Info size={18} color="#64748B" strokeWidth={2.2} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>App Version</Text>
              <Text style={styles.menuSubtitle}>RACE Partner v1.0.0 (Production Build)</Text>
            </View>
          </View>
        </View>

        {/* Development Mode Role Switcher (gated to preview mode) */}
        {UI_PREVIEW_MODE ? (
          <Pressable
            style={({ pressed }) => [
              styles.switchRoleButton,
              getPressableFeedback(pressed),
            ]}
            onPress={() => void switchMockRole(dispatch, isDriver ? 'vendor' : 'driver')}>
            <Text style={styles.switchRoleText}>
              {isDriver ? '⚡ Switch to Vendor Preview' : '⚡ Switch to Driver Preview'}
            </Text>
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
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>

      {/* Supporting Dialogs & Sheets */}
      <PartnerLogoutDialog
        visible={logoutVisible}
        isLoading={loggingOut}
        onCancel={() => setLogoutVisible(false)}
        onConfirm={performLogout}
      />

      <PartnerLanguageSheet
        visible={langSheetVisible}
        selectedLanguage={selectedLang}
        onSelect={setSelectedLang}
        onClose={() => setLangSheetVisible(false)}
      />

      <PartnerLocationSheet
        visible={locationSheetVisible}
        onAllow={handleAllowLocation}
        onDeny={() => setLocationSheetVisible(false)}
      />

      <PartnerNotificationPreferencesModal
        visible={notifPrefsVisible}
        onClose={() => setNotifPrefsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: driverColors.pageBg,
  },
  headerPad: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: driverColors.hairline,
    backgroundColor: driverColors.pageBg,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: driverColors.ink,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: driverColors.hairline,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: driverColors.creamRow,
    borderWidth: 2,
    borderColor: driverColors.amberTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: driverColors.ink,
  },
  editAvatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: driverColors.white,
    borderWidth: 1,
    borderColor: '#D0D4DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: driverColors.ink,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  rolePill: {
    backgroundColor: driverColors.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: driverRadius.pill,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: driverColors.grey,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: driverColors.greenPill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: driverRadius.pill,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: driverColors.green,
  },
  reviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: driverColors.amberTile,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: driverRadius.pill,
  },
  reviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: driverColors.amberText,
  },
  partnerId: {
    fontSize: 12,
    color: driverColors.greySoft,
    marginTop: 2,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: driverColors.light,
    borderRadius: driverRadius.innerCard,
    paddingVertical: 12,
    paddingHorizontal: 8,
    width: '100%',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: driverColors.ink,
  },
  metricSubtitle: {
    fontSize: 11,
    color: driverColors.grey,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E4E8',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: driverColors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: driverColors.white,
    borderRadius: driverRadius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
