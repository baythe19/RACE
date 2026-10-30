import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, Info, UserRound } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { useScreenPx } from '../../hooks/useScreenPx';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { getProfileInitial } from '../../utils/profileDisplay';
import { colors, typography } from '../../theme';

type Props = {
  title?: string;
  subtitle?: string;
  leading?: ReactNode;
  avatarLabel?: string;
  showActions?: boolean;
  /** When false, hide header profile circle (e.g. Profile tab root). */
  showProfileAvatar?: boolean;
  /** Unread count — numeric badge on bell (no dot, no circular outline). */
  notificationCount?: number;
  onBellPress?: () => void;
  onAvatarPress?: () => void;
  onInfoPress?: () => void;
  actions?: ReactNode;
};

export default function TabRootHeader({
  title,
  subtitle,
  leading,
  avatarLabel,
  showActions = true,
  showProfileAvatar = true,
  notificationCount = 0,
  onBellPress,
  onAvatarPress,
  onInfoPress,
  actions,
}: Props) {
  const px = useScreenPx();
  const navigation = useNavigation();
  const profile = useProfileStore(state => state.profile);
  const authUser = useAuthStore(state => state.user);
  const resolvedAvatarLabel =
    avatarLabel ??
    getProfileInitial(profile?.fullName ?? authUser?.fullName) ??
    '';

  const handleBell = () => {
    if (onBellPress) {
      onBellPress();
      return;
    }
    const parent = navigation.getParent();
    if (parent) {
      (parent as { navigate: (name: string, params?: object) => void }).navigate('Profile', {
        screen: 'Notifications',
      });
      return;
    }
    navigation.navigate('Notifications' as never);
  };

  const badgeLabel = notificationCount > 99 ? '99+' : String(notificationCount);

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: px(20),
          paddingTop: px(8),
          paddingBottom: px(12),
          backgroundColor: colors.pageBg,
        },
      ]}>
      <View style={[styles.row, { minHeight: px(52) }]}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: px(12) }}>
          {leading ?? (
            <>
              <Text
                style={{
                  fontSize: px(18),
                  fontWeight: typography.weights.extrabold,
                  color: colors.dark,
                  lineHeight: px(22),
                  letterSpacing: -0.3,
                  textAlign: 'left',
                }}
                numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={{
                    marginTop: px(2),
                    fontSize: px(11),
                    color: colors.grey,
                    lineHeight: px(16),
                    textAlign: 'left',
                  }}
                  numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </>
          )}
        </View>
        {actions ??
          (showActions ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
              {onInfoPress ? (
                <Pressable
                  hitSlop={10}
                  onPress={onInfoPress}
                  style={styles.iconTap}
                  accessibilityRole="button"
                  accessibilityLabel="How SOS alert works">
                  <Info size={px(17)} color={colors.grey} strokeWidth={2.2} />
                </Pressable>
              ) : null}
              <Pressable
                hitSlop={8}
                onPress={handleBell}
                style={[styles.iconTap, { position: 'relative' }]}
                accessibilityRole="button"
                accessibilityLabel="Notifications">
                <Bell size={px(20)} color={colors.dark} strokeWidth={2} />
                {notificationCount > 0 ? (
                  <View
                    style={[
                      styles.bellBadge,
                      {
                        top: px(2),
                        right: px(0),
                        minWidth: px(16),
                        height: px(16),
                        borderRadius: px(8),
                        paddingHorizontal: px(3),
                      },
                    ]}>
                    <Text
                      style={{
                        fontSize: px(9),
                        fontWeight: typography.weights.bold,
                        color: colors.background,
                        lineHeight: px(11),
                      }}>
                      {badgeLabel}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              {showProfileAvatar ? (
              <Pressable
                onPress={onAvatarPress}
                disabled={!onAvatarPress}
                style={[
                  styles.avatar,
                  {
                    width: px(34),
                    height: px(34),
                    borderRadius: px(17),
                  },
                ]}
                accessibilityRole={onAvatarPress ? 'button' : undefined}
                accessibilityLabel="Profile">
                {resolvedAvatarLabel ? (
                  <Text
                    style={{
                      fontSize: px(13),
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    {resolvedAvatarLabel}
                  </Text>
                ) : (
                  <UserRound size={px(16)} color={colors.primary} strokeWidth={2} />
                )}
              </Pressable>
              ) : null}
            </View>
          ) : null)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconTap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
});
