import { PartnerText } from '../../../components/partner/PartnerText';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Smartphone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch } from '../../../redux/hooks';
import { logout } from '../../../redux/auth/authSlice';
import { useAuthStore } from '../../../store/authStore';
import { colors, layout, radius, spacing, typography } from '../../../theme';

export default function WrongAppRoleScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    try {
      await useAuthStore.getState().logout();
      dispatch(logout());
    } catch {
      // Non-fatal
    }
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
      ]}>
      <View style={styles.iconWrap}>
        <Smartphone size={40} color={colors.primary} strokeWidth={2} />
      </View>
      <PartnerText style={styles.title}>Use RACE Customer</PartnerText>
      <PartnerText style={styles.body}>
        This number is registered as a Customer. Book towing, driver hire, and roadside help in the
        RACE Customer app — not the Partner app.
      </PartnerText>
      <PartnerText style={styles.hint}>
        Install <PartnerText style={styles.bold}>RACE Customer</PartnerText>, or sign out and continue partner
        signup with a different number.
      </PartnerText>
      <Pressable
        onPress={() => void handleLogout()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={({ pressed }) => [
          styles.button,
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        ]}>
        <PartnerText style={styles.buttonLabel}>Sign out</PartnerText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPadding,
    alignItems: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.dark,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    color: colors.grey,
    fontSize: typography.sizes.md,
    lineHeight: typography.lineHeights.relaxed,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  hint: {
    color: colors.dark,
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.relaxed,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  bold: {
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  button: {
    minHeight: 52,
    minWidth: 200,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonLabel: {
    color: colors.dark,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
});
