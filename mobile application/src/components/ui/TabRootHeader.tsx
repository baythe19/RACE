import { PartnerText } from '../partner/PartnerText';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Bell, UserRound } from 'lucide-react-native';

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
  actions?: ReactNode;
};

export default function TabRootHeader({
  title,
  subtitle,
  leading,
  avatarLabel,
  showActions = true,
  actions,
}: Props) {
  const px = useScreenPx();
  const profile = useProfileStore(state => state.profile);
  const authUser = useAuthStore(state => state.user);
  const resolvedAvatarLabel =
    avatarLabel ??
    getProfileInitial(profile?.fullName ?? authUser?.fullName) ??
    '';

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: px(20),
          paddingBottom: px(12),
        },
      ]}>
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {leading ?? (
            <>
              <PartnerText
                style={{
                  fontSize: px(28),
                  fontWeight: typography.weights.extrabold,
                  color: colors.dark,
                }}>
                {title}
              </PartnerText>
              {subtitle ? (
                <PartnerText
                  style={{
                    marginTop: px(4),
                    fontSize: px(13),
                    color: colors.grey,
                    lineHeight: px(18),
                  }}>
                  {subtitle}
                </PartnerText>
              ) : null}
            </>
          )}
        </View>
        {actions ?? (showActions ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
            <Pressable hitSlop={8} style={styles.bellWrap}>
              <Bell size={px(22)} color={colors.dark} strokeWidth={2} />
              <View style={styles.bellDot} />
            </Pressable>
            <View
              style={[
                styles.avatar,
                { width: px(40), height: px(40), borderRadius: px(20) },
              ]}>
              {resolvedAvatarLabel ? (
                <PartnerText
                  style={{
                    fontSize: px(15),
                    fontWeight: typography.weights.bold,
                    color: colors.dark,
                  }}>
                  {resolvedAvatarLabel}
                </PartnerText>
              ) : (
                <UserRound size={px(18)} color={colors.primary} strokeWidth={2} />
              )}
            </View>
          </View>
        ) : null)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
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
  },
  bellDot: {
    position: 'absolute',
    top: 1,
    right: 1,
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
  },
});
