import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Home,
  MapPin,
  Sparkles,
  Truck,
  UserRound,
  X,
  Zap,
  BookOpen,
  ShieldAlert,
  Wrench,
} from 'lucide-react-native';

import {
  CUSTOMER_QA_MOBILE,
  UI_QA_NAVIGATOR_ENABLED,
  isCustomerMockDataEnabled,
  setCustomerMockDataEnabled,
  subscribeCustomerMockData,
} from '../../config/customerQa';
import { ensurePreviewAuthSession } from '../../config/uiPreviewAuth';
import { useAppDispatch } from '../../redux/hooks';
import { logout } from '../../redux/auth/authSlice';
import {
  customerNavigationRef,
  jumpToAuthScreen,
  jumpToMainTab,
} from '../../navigation/customerNavigationRef';
import { bookingKeys } from '../../services/bookings/useBookingQueries';
import { colors } from '../../theme';

type Jump = {
  label: string;
  hint?: string;
  Icon: typeof Home;
  run: () => void;
};

export function CustomerUiQaNavigator() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mockOn, setMockOn] = useState(isCustomerMockDataEnabled());

  useEffect(() => subscribeCustomerMockData(setMockOn), []);

  if (!UI_QA_NAVIGATOR_ENABLED) return null;

  const ensureMockSession = () => {
    ensurePreviewAuthSession(dispatch, true);
    void queryClient.invalidateQueries();
  };

  const goAuth = (screen: Parameters<typeof jumpToAuthScreen>[0], params?: object) => {
    setOpen(false);
    if (mockOn) {
      // Stay unauthenticated for auth screens unless jumping past OTP.
      if (screen !== 'MobileNumber' && screen !== 'Onboarding' && screen !== 'OtpVerification') {
        ensurePreviewAuthSession(dispatch, false);
      }
    }
    setTimeout(() => jumpToAuthScreen(screen, params), 80);
  };

  const goMain = (
    tab: Parameters<typeof jumpToMainTab>[0],
    nested?: { screen: string; params?: object },
  ) => {
    setOpen(false);
    if (mockOn) ensureMockSession();
    setTimeout(() => jumpToMainTab(tab, nested), 120);
  };

  const groups: Array<{ title: string; items: Jump[] }> = [
    {
      title: 'Auth',
      items: [
        {
          label: 'Onboarding',
          Icon: Sparkles,
          run: () => goAuth('Onboarding'),
        },
        {
          label: 'Sign in (mobile)',
          Icon: UserRound,
          run: () => goAuth('MobileNumber'),
        },
        {
          label: 'OTP screen',
          hint: `QA ${CUSTOMER_QA_MOBILE}`,
          Icon: ShieldAlert,
          run: () =>
            goAuth('OtpVerification', {
              mobileNumber: CUSTOMER_QA_MOBILE,
              isExistingUser: true,
              devOtp: '123456',
            }),
        },
        {
          label: 'Profile wizard',
          Icon: UserRound,
          run: () => goAuth('ProfileWizard'),
        },
      ],
    },
    {
      title: 'Main tabs',
      items: [
        { label: 'Home', Icon: Home, run: () => goMain('Home', { screen: 'HomeMain' }) },
        { label: 'Services', Icon: Wrench, run: () => goMain('Services', { screen: 'ServicesMain' }) },
        {
          label: 'Bookings (empty / real)',
          hint: 'Uses current mock toggle',
          Icon: BookOpen,
          run: () => goMain('Bookings', { screen: 'BookingsMain' }),
        },
        {
          label: 'Bookings — with mock data',
          hint: 'Active towing + driver + history cards',
          Icon: BookOpen,
          run: () => {
            setMockOn(true);
            setCustomerMockDataEnabled(true);
            ensureMockSession();
            setOpen(false);
            setTimeout(() => {
              void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
              jumpToMainTab('Bookings', { screen: 'BookingsMain' });
            }, 120);
          },
        },
        { label: 'SOS / Call', Icon: ShieldAlert, run: () => goMain('Call', { screen: 'CallMain' }) },
        { label: 'Profile', Icon: UserRound, run: () => goMain('Profile', { screen: 'ProfileMain' }) },
      ],
    },
    {
      title: 'Booking flows (UI)',
      items: [
        {
          label: 'Towing — pickup/drop',
          Icon: Truck,
          run: () => goMain('Home', { screen: 'TowingPickupDrop' }),
        },
        {
          label: 'Driver — date/time',
          Icon: MapPin,
          run: () => goMain('Home', { screen: 'DriverDateTime' }),
        },
        {
          label: 'Driver — pickup',
          Icon: MapPin,
          run: () => goMain('Home', { screen: 'DriverPickup' }),
        },
        {
          label: 'My vehicles',
          Icon: Truck,
          run: () => goMain('Profile', { screen: 'MyVehicles' }),
        },
        {
          label: 'Notifications',
          Icon: BookOpen,
          run: () => goMain('Profile', { screen: 'Notifications' }),
        },
        {
          label: 'Help & support',
          Icon: Sparkles,
          run: () => goMain('Profile', { screen: 'HelpSupport' }),
        },
      ],
    },
  ];

  const onToggleMock = (value: boolean) => {
    setMockOn(value);
    setCustomerMockDataEnabled(value);
    if (value) {
      ensureMockSession();
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    } else {
      dispatch(logout());
      void queryClient.clear();
      if (customerNavigationRef.isReady()) {
        jumpToAuthScreen('MobileNumber');
      }
    }
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        collapsable={false}
        style={[styles.fabWrap, { bottom: Math.max(96, insets.bottom + 110) }]}>
        <Pressable
          testID="customer-ui-qa-fab"
          accessibilityRole="button"
          accessibilityLabel="Open customer UI QA"
          onPress={() => setOpen(true)}
          style={styles.fab}>
          <Zap size={14} color="#111" strokeWidth={3} />
          <Text style={styles.fabText}>UI QA</Text>
        </Pressable>
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Sparkles size={18} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.title}>Customer UI QA</Text>
              </View>
              <Pressable hitSlop={12} onPress={() => setOpen(false)} style={styles.close}>
                <X size={20} color="#111" strokeWidth={2.4} />
              </Pressable>
            </View>

            <View style={styles.toggleCard}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.toggleTitle}>
                  {mockOn ? 'With mock data' : 'Without mock data (real API)'}
                </Text>
                <Text style={styles.toggleHint}>
                  {mockOn
                    ? 'Skips OTP / uses preview session so you can jump screens for UI work.'
                    : `Real backend + whitelist OTP ${CUSTOMER_QA_MOBILE} → 123456.`}
                </Text>
              </View>
              <Switch
                value={mockOn}
                onValueChange={onToggleMock}
                trackColor={{ false: '#D1D5DB', true: '#F5C518' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {groups.map(group => (
                <View key={group.title} style={styles.group}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  {group.items.map(item => (
                    <Pressable
                      key={item.label}
                      onPress={item.run}
                      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
                      <View style={styles.rowIcon}>
                        <item.Icon size={16} color="#111" strokeWidth={2.2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowLabel}>{item.label}</Text>
                        {item.hint ? <Text style={styles.rowHint}>{item.hint}</Text> : null}
                      </View>
                      <ChevronRight size={16} color="#9CA3AF" />
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default CustomerUiQaNavigator;

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 14,
    zIndex: 99999,
    elevation: 24,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5C518',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#111',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5C518',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },
  toggleHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 8 },
  group: { marginBottom: 14 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  rowHint: {
    marginTop: 2,
    fontSize: 11,
    color: '#6B7280',
  },
});
