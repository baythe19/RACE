import React, { useEffect, useMemo } from 'react';
import {
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Crown,
  IndianRupee,
  LogOut,
  Pencil,
  Shield,
  UserRound,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PROFILE_MENU_ITEMS } from '../constants/profileScreen';
import { PROFILE_MENU_ROUTES } from '../constants/profileSubScreens';
import AppScreenLayout from '../components/ui/AppScreenLayout';
import DataSkeleton from '../components/ui/DataSkeleton';
import TabRootHeader from '../components/ui/TabRootHeader';
import { getProfileFirstName } from '../utils/profileDisplay';
import { useAppDialog } from '../hooks/useAppDialog';
import { useAuthActions } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { useNotificationsQuery, useWalletQuery } from '../services/profile/useProfileQueries';
import { useProfileStore } from '../store/profileStore';
import type { ProfileStackParamList } from '../types/navigation';
import { colors, shadows, typography } from '../theme';

const REF_W = 390;

function ProfileAvatar({ size, px }: { size: number; px: (n: number) => number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.goldLight,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
      <UserRound
        size={px(Math.round(size * 0.42))}
        color={colors.primary}
        fill={colors.primary}
        strokeWidth={1.5}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { logout } = useAuthActions();
  const { dialog, showDialog } = useAppDialog();
  const authUser = useAuthStore(state => state.user);
  const { profile, fetchProfile, isLoading } = useProfileStore();
  const { data: notificationsData } = useNotificationsQuery();
  const {
    data: wallet,
    isLoading: isWalletLoading,
    isError: isWalletError,
    refetch: refetchWallet,
  } = useWalletQuery();
  const unreadCount = notificationsData?.unreadCount ?? 0;
  const { width } = useWindowDimensions();
  const s = width / REF_W;
  const px = (n: number) => Math.round(n * s);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const displayName =
    getProfileFirstName(profile?.fullName) ||
    getProfileFirstName(authUser?.fullName) ||
    'User';
  const displayPhone = profile?.mobileNumber ?? authUser?.mobileNumber ?? '';

  const walletLabel = useMemo(() => {
    if (isWalletLoading) return '...';
    if (isWalletError) return 'Tap to retry';
    if (wallet) return `₹${wallet.balance.toLocaleString('en-IN')}`;
    return '—';
  }, [isWalletError, isWalletLoading, wallet]);

  const handleLogout = () => {
    showDialog({
      tone: 'confirm',
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      secondaryLabel: 'No',
      primaryLabel: 'Yes, log out',
      destructive: true,
      onPrimary: () => {
        void logout().catch(() => {
          showDialog({
            tone: 'error',
            title: 'Logout failed',
            message: 'Please try again or reload the app.',
            primaryLabel: 'OK',
          });
        });
      },
    });
  };

  if (isLoading && !profile) {
    return (
      <AppScreenLayout
        backgroundColor={colors.pageBg}
        scrollable={false}
        header={
          <TabRootHeader
            title="Profile"
            showActions={false}
          />
        }>
        <View style={{ flex: 1, paddingTop: 8 }}>
          <DataSkeleton variant="profile" />
        </View>
      </AppScreenLayout>
    );
  }

  return (
    <AppScreenLayout
      backgroundColor={colors.pageBg}
      header={
        <TabRootHeader
          title="Profile"
          notificationCount={unreadCount}
          showProfileAvatar={false}
          onBellPress={() => navigation.navigate('Notifications')}
        />
      }>
      {dialog}
            <View
              style={[
                {
                  marginTop: px(16),
                  marginBottom: px(12),
                  borderRadius: px(18),
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  padding: px(14),
                },
                shadows.card,
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
                <ProfileAvatar size={px(62)} px={px} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: px(6),
                    }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        flexShrink: 1,
                        fontSize: px(16),
                        fontWeight: typography.weights.extrabold,
                        color: colors.dark,
                        letterSpacing: -0.2,
                      }}>
                      {displayName}
                    </Text>
                    <Pressable
                      hitSlop={10}
                      onPress={() => navigation.navigate('PersonalInformation')}
                      accessibilityRole="button"
                      accessibilityLabel="Edit profile">
                      <Pencil size={px(14)} color={colors.grey} strokeWidth={2} />
                    </Pressable>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: px(12.5), color: colors.grey, marginTop: px(3) }}>
                    {displayPhone}
                  </Text>
                  {profile?.email ? (
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: px(11.5), color: colors.grey, marginTop: px(1) }}>
                      {profile.email}
                    </Text>
                  ) : null}
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: px(4),
                      paddingHorizontal: px(7),
                      paddingVertical: px(4),
                      borderRadius: px(6),
                      backgroundColor: '#E8F8EE',
                      marginTop: px(7),
                      borderWidth: 1,
                      borderColor: 'rgba(22,163,74,0.18)',
                    }}>
                    <Check size={px(11)} color={colors.success} strokeWidth={3} />
                    <Text
                      style={{
                        fontSize: px(10),
                        fontWeight: typography.weights.bold,
                        color: colors.success,
                      }}>
                      Verified
                    </Text>
                  </View>
                </View>
                {/* Premium chip — compact pill, single text line, no stray arrow */}
                <Pressable
                  onPress={() => navigation.navigate('SubscriptionPlans')}
                  style={{
                    alignSelf: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                    gap: px(4),
                    paddingHorizontal: px(10),
                    paddingVertical: px(9),
                    borderRadius: px(14),
                    backgroundColor: colors.goldLight,
                    borderWidth: 1,
                    borderColor: 'rgba(245,166,35,0.35)',
                  }}>
                  <Crown size={px(18)} color={colors.primary} fill={colors.primary} />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: px(8.5),
                      fontWeight: typography.weights.bold,
                      color: colors.primary,
                      lineHeight: px(10),
                    }}>
                    PREMIUM
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => {
                if (isWalletError) {
                  void refetchWallet();
                  return;
                }
                navigation.navigate('PaymentMethods');
              }}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: px(16),
                  borderWidth: 1,
                  borderColor: 'rgba(245,166,35,0.35)',
                  backgroundColor: colors.goldLight,
                  paddingVertical: px(13),
                  paddingHorizontal: px(14),
                  marginBottom: px(14),
                  gap: px(10),
                },
                shadows.card,
              ]}>
              <View
                style={{
                  width: px(42),
                  height: px(42),
                  borderRadius: px(21),
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: 'rgba(245,166,35,0.25)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                <IndianRupee size={px(20)} color={colors.primary} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: px(11), color: colors.grey }}>Wallet Balance</Text>
                <Text
                  style={{
                    marginTop: px(2),
                    fontSize: px(19),
                    fontWeight: typography.weights.extrabold,
                    color: colors.dark,
                    letterSpacing: -0.3,
                  }}>
                  {walletLabel}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: px(2),
                  backgroundColor: colors.background,
                  borderRadius: px(12),
                  paddingHorizontal: px(10),
                  paddingVertical: px(7),
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                <Text style={{ fontSize: px(11), fontWeight: typography.weights.bold, color: colors.dark }}>
                  Top Up
                </Text>
                <ChevronRight size={px(13)} color={colors.dark} strokeWidth={2.4} />
              </View>
            </Pressable>

            <View
              style={{
                borderRadius: px(16),
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                marginBottom: px(14),
                overflow: 'hidden',
              }}>
              {PROFILE_MENU_ITEMS.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    navigation.navigate(
                      PROFILE_MENU_ROUTES[item.id as keyof typeof PROFILE_MENU_ROUTES],
                    )
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: px(12),
                    paddingHorizontal: px(14),
                    paddingVertical: px(13),
                    borderBottomWidth: index < PROFILE_MENU_ITEMS.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}>
                  <View
                    style={{
                      width: px(36),
                      height: px(36),
                      borderRadius: px(18),
                      backgroundColor: colors.goldLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                    <item.Icon size={px(17)} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontSize: px(14),
                        fontWeight: typography.weights.bold,
                        color: colors.dark,
                        marginBottom: px(2),
                      }}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: px(11), color: colors.grey }}>
                      {item.subtitle}
                    </Text>
                  </View>
                  {item.id === 'notifications' && unreadCount > 0 ? (
                    <View
                      style={{
                        minWidth: px(22),
                        height: px(22),
                        borderRadius: px(11),
                        paddingHorizontal: px(6),
                        backgroundColor: colors.error,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text
                        style={{
                          fontSize: px(10),
                          fontWeight: typography.weights.bold,
                          color: colors.background,
                        }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  ) : (
                    <ChevronRight size={px(16)} color={colors.primary} strokeWidth={2} />
                  )}
                </Pressable>
              ))}
            </View>

            <View
              style={{
                borderRadius: px(14),
                backgroundColor: colors.goldLight,
                padding: px(14),
                marginBottom: px(12),
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: px(10) }}>
                <View
                  style={{
                    width: px(40),
                    height: px(40),
                    borderRadius: px(20),
                    backgroundColor: colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  <Shield size={px(20)} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: px(15),
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                      marginBottom: px(4),
                    }}>
                    RACE Premium
                  </Text>
                  <Text
                    style={{
                      fontSize: px(11),
                      color: colors.grey,
                      lineHeight: px(16),
                      marginBottom: px(10),
                    }}>
                    Priority support, faster dispatch & exclusive benefits
                  </Text>
                  <Pressable
                    onPress={() => navigation.navigate('SubscriptionPlans')}
                    style={{
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: px(4),
                      paddingHorizontal: px(12),
                      paddingVertical: px(8),
                      borderRadius: px(10),
                      backgroundColor: colors.primary,
                    }}>
                    <Text
                      style={{
                        fontSize: px(12),
                        fontWeight: typography.weights.bold,
                        color: colors.dark,
                      }}>
                      Upgrade Now
                    </Text>
                    <ArrowRight size={px(14)} color={colors.dark} strokeWidth={2.5} />
                  </Pressable>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Log out of your account"
              style={({ pressed }) => ({
                marginTop: px(6),
                marginBottom: px(16),
                borderRadius: px(14),
                borderWidth: 1,
                borderColor: 'rgba(220,38,38,0.28)',
                backgroundColor: pressed ? '#FEE2E2' : '#FEF2F2',
                paddingVertical: px(14),
                paddingHorizontal: px(16),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: px(8),
              })}>
              <LogOut size={px(18)} color={colors.error} strokeWidth={2.2} />
              <Text
                style={{
                  fontSize: px(15),
                  fontWeight: typography.weights.bold,
                  color: colors.error,
                }}>
                Log out
              </Text>
            </Pressable>

            <Text
              style={{
                textAlign: 'center',
                fontSize: px(10),
                color: colors.grey,
                marginBottom: px(8),
              }}>
              RACE Customer · v1.0.0
            </Text>
    </AppScreenLayout>
  );
}
