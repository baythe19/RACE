import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, UserRound } from 'lucide-react-native';
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
  showNotificationBadge?: boolean;
  onBellPress?: () => void;
  onAvatarPress?: () => void;
  actions?: ReactNode;
};

export default function TabRootHeader({
  title,
  subtitle,
  leading,
  avatarLabel,
  showActions = true,
  showNotificationBadge = false,
  onBellPress,
  onAvatarPress,
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
    // Prefer Profile stack notifications when available
    const parent = navigation.getParent();
    if (parent) {
      (parent as any).navigate('Profile', { screen: 'Notifications' });
      return;
    }
    navigation.navigate('Notifications' as never);
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: px(20),
          paddingBottom: px(12),
          backgroundColor: colors.pageBg,
        },
      ]}>
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: px(12) }}>
          {leading ?? (
            <>
              <Text
                style={{
                  fontSize: px(26),
                  fontWeight: typography.weights.extrabold,
                  color: colors.dark,
                  lineHeight: px(32),
                }}
                numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={{
                    marginTop: px(4),
                    fontSize: px(13),
                    color: colors.grey,
                    lineHeight: px(18),
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
              <Pressable
                hitSlop={8}
                onPress={handleBell}
                style={styles.bellWrap}
                accessibilityRole="button"
                accessibilityLabel="Notifications">
                <Bell size={px(22)} color={colors.dark} strokeWidth={2} />
                {showNotificationBadge ? <View style={styles.bellDot} /> : null}
              </Pressable>
              <Pressable
                onPress={onAvatarPress}
                disabled={!onAvatarPress}
                style={[
                  styles.avatar,
                  { width: px(40), height: px(40), borderRadius: px(20) },
                ]}
                accessibilityRole={onAvatarPress ? 'button' : undefined}
                accessibilityLabel="Profile">
                {resolvedAvatarLabel ? (
                  <Text
                    style={{
                      fontSize: px(15),
                      fontWeight: typography.weights.bold,
                      color: colors.dark,
                    }}>
                    {resolvedAvatarLabel}
                  </Text>
                ) : (
                  <UserRound size={px(18)} color={colors.primary} strokeWidth={2} />
                )}
              </Pressable>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bellWrap: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  avatar: {
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F5D98A',
  },
});
