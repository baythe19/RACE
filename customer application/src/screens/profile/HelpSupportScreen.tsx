import React, { type ReactNode } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { ChevronRight, Mail, Phone, Siren } from 'lucide-react-native';

import WhatsAppIcon from '../../components/icons/WhatsAppIcon';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import { HELP_FAQ_ITEMS } from '../../constants/profileSubScreens';
import { useAppDialog } from '../../hooks/useAppDialog';
import { brand } from '../../theme/brand';
import { colors, shadows, typography } from '../../theme';

function QuickHelpCard({
  label,
  icon,
  online,
  px,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  online?: boolean;
  px: (n: number) => number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flex: 1,
          alignItems: 'center',
          borderRadius: px(12),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          paddingVertical: px(14),
          paddingHorizontal: px(6),
        },
        shadows.card,
      ]}>
      {icon}
      <Text
        style={{
          marginTop: px(6),
          fontSize: px(11),
          fontWeight: typography.weights.bold,
          color: colors.dark,
          textAlign: 'center',
        }}>
        {label}
      </Text>
      {online ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4), marginTop: px(4) }}>
          <View
            style={{
              width: px(5),
              height: px(5),
              borderRadius: px(3),
              backgroundColor: colors.success,
            }}
          />
          <Text style={{ fontSize: px(9), color: colors.success, fontWeight: typography.weights.bold }}>
            Online
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function HelpSupportScreen() {
  const px = useProfilePx();
  const { dialog, showDialog } = useAppDialog();

  return (
    <ProfileSubScreenLayout title="Help & Support">
      {dialog}
      <View
        style={{
          borderRadius: px(14),
          backgroundColor: colors.error,
          padding: px(14),
          marginBottom: px(18),
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
          <View
            style={{
              width: px(44),
              height: px(44),
              borderRadius: px(22),
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
            <Siren size={px(22)} color={colors.background} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.background }}>
              Emergency? Call Now!
            </Text>
            <Text style={{ fontSize: px(16), fontWeight: typography.weights.extrabold, color: colors.background }}>
              {brand.phone}
            </Text>
            <Text style={{ fontSize: px(10), color: 'rgba(255,255,255,0.85)' }}>Available 24/7</Text>
          </View>
          <Pressable
            onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: px(4),
              paddingHorizontal: px(10),
              paddingVertical: px(8),
              borderRadius: px(20),
              borderWidth: 1.5,
              borderColor: colors.background,
            }}>
            <Phone size={px(12)} color={colors.background} strokeWidth={2.5} />
            <Text style={{ fontSize: px(11), fontWeight: typography.weights.bold, color: colors.background }}>
              Call Now
            </Text>
          </Pressable>
        </View>
      </View>

      <Text
        style={{
          fontSize: px(15),
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginBottom: px(10),
        }}>
        Quick Help
      </Text>
      <View style={{ flexDirection: 'row', gap: px(8), marginBottom: px(18) }}>
        <QuickHelpCard
          label="Call Us"
          icon={
            <View
              style={{
                width: px(32),
                height: px(32),
                borderRadius: px(8),
                backgroundColor: colors.goldLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Phone size={px(18)} color={colors.primary} strokeWidth={2.2} />
            </View>
          }
          online
          px={px}
          onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
        />
        <QuickHelpCard
          label="Email Us"
          icon={
            <View
              style={{
                width: px(32),
                height: px(32),
                borderRadius: px(8),
                backgroundColor: colors.goldLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Mail size={px(18)} color={colors.primary} strokeWidth={2.2} />
            </View>
          }
          px={px}
          onPress={() => void Linking.openURL(`mailto:${brand.email}`)}
        />
        <QuickHelpCard
          label="WhatsApp"
          icon={<WhatsAppIcon size={px(28)} />}
          px={px}
          onPress={() =>
            void Linking.openURL(
              `https://wa.me/91${brand.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(
                'Hi RACE Support, I need help with my booking.',
              )}`,
            )
          }
        />
      </View>

      <Text
        style={{
          fontSize: px(15),
          fontWeight: typography.weights.bold,
          color: colors.dark,
          marginBottom: px(10),
        }}>
        Frequently Asked Questions
      </Text>
      <View
        style={{
          borderRadius: px(14),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          marginBottom: px(16),
          overflow: 'hidden',
        }}>
        {HELP_FAQ_ITEMS.map((item, index) => (
          <Pressable
            key={item.question}
            onPress={() =>
              showDialog({
                tone: 'info',
                title: item.question,
                message: item.answer,
                primaryLabel: 'Got it',
              })
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: px(14),
              paddingVertical: px(13),
              borderBottomWidth: index < HELP_FAQ_ITEMS.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}>
            <Text style={{ flex: 1, fontSize: px(13), color: colors.dark, paddingRight: px(8) }}>
              {item.question}
            </Text>
            <ChevronRight size={px(16)} color={colors.grey} />
          </Pressable>
        ))}
      </View>

      <View
        style={{
          borderRadius: px(14),
          backgroundColor: colors.goldLight,
          padding: px(14),
        }}>
        <View>
          <Text style={{ fontSize: px(15), fontWeight: typography.weights.bold, marginBottom: px(4) }}>
            <Text style={{ color: colors.error }}>RACE </Text>
            <Text style={{ color: colors.dark }}>Service Support</Text>
          </Text>
          <Text style={{ fontSize: px(12), color: colors.primary, marginBottom: px(10) }}>
            Mon–Sun: 24 hours
          </Text>
          <Pressable
            onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: px(8), marginBottom: px(6) }}>
            <Phone size={px(14)} color={colors.primary} strokeWidth={2.2} />
            <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>
              {brand.phone}
            </Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL('mailto:support@raceservice.in')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8) }}>
              <Mail size={px(14)} color={colors.primary} strokeWidth={2.2} />
              <Text style={{ fontSize: px(13), color: colors.dark }}>support@raceservice.in</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Legal */}
      <View
        style={{
          borderRadius: px(14),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          marginTop: px(16),
          overflow: 'hidden',
        }}>
        <Pressable
          onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: px(14),
              paddingVertical: px(13),
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityRole="link"
          accessibilityLabel="Read Terms and Privacy Policy">
          <Text style={{ fontSize: px(13), fontWeight: typography.weights.semibold, color: colors.dark }}>
            Terms & Privacy Policy
          </Text>
          <ChevronRight size={px(16)} color={colors.grey} />
        </Pressable>
      </View>
    </ProfileSubScreenLayout>
  );
}
