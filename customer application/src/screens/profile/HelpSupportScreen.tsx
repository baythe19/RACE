import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Mail,
  Phone,
  Shield,
  Siren,
  Trash2,
} from 'lucide-react-native';

import WhatsAppIcon from '../../components/icons/WhatsAppIcon';
import ProfileSubScreenLayout, { useProfilePx } from '../../components/profile/ProfileSubScreenLayout';
import {
  HELP_FAQ_SECTIONS,
  HELP_SELF_SERVE_LINKS,
  type HelpSelfServeLinkId,
} from '../../constants/profileSubScreens';
import { jumpToMainTab } from '../../navigation/customerNavigationRef';
import type { ProfileStackParamList } from '../../types/navigation';
import { useAppDialog } from '../../hooks/useAppDialog';
import { useProfileStore } from '../../store/profileStore';
import { brand } from '../../theme/brand';
import {
  emergencyContactDigits,
  formatEmergencyPhoneDisplay,
  hasSavedEmergencyContact,
  telUriForDigits,
} from '../../utils/emergencyContact';
import { colors, shadows, typography } from '../../theme';

function SectionLabel({ px, children }: { px: (n: number) => number; children: string }) {
  return (
    <Text
      style={{
        fontSize: px(10),
        fontWeight: typography.weights.bold,
        color: colors.grey,
        letterSpacing: 0.6,
        marginBottom: px(8),
      }}>
      {children}
    </Text>
  );
}

function GroupedCard({ px, children }: { px: (n: number) => number; children: React.ReactNode }) {
  return (
    <View
      style={[
        {
          borderRadius: px(14),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          overflow: 'hidden',
          marginBottom: px(16),
        },
        shadows.card,
      ]}>
      {children}
    </View>
  );
}

function ContactRow({
  px,
  icon,
  title,
  subtitle,
  onPress,
  isLast,
}: {
  px: (n: number) => number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(12),
        paddingHorizontal: px(14),
        paddingVertical: px(13),
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
        backgroundColor: pressed ? colors.pageBg : colors.background,
      })}>
      <View
        style={{
          width: px(36),
          height: px(36),
          borderRadius: px(12),
          backgroundColor: colors.goldLight,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
        {icon}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>{title}</Text>
        <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(2) }} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={px(16)} color={colors.grey} />
    </Pressable>
  );
}

const SELF_SERVE_ICONS: Record<HelpSelfServeLinkId, typeof CalendarDays> = {
  bookings: CalendarDays,
  payments: CreditCard,
  sos: Siren,
  notifications: Bell,
};

export default function HelpSupportScreen() {
  const px = useProfilePx();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { dialog, showDialog } = useAppDialog();
  const { profile, fetchProfile } = useProfileStore();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const emergencyContact = profile?.emergencyContact;
  const hasEmergency = hasSavedEmergencyContact(emergencyContact);
  const emergencyDigits = emergencyContactDigits(emergencyContact);
  const emergencyTel = telUriForDigits(emergencyDigits);

  const whatsappUrl = `https://wa.me/91${brand.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(
    'Hi RACE Support, I need help with my booking.',
  )}`;

  const handleSelfServe = (id: HelpSelfServeLinkId) => {
    if (id === 'bookings') {
      jumpToMainTab('Bookings', { screen: 'BookingsMain' });
      return;
    }
    if (id === 'payments') {
      navigation.navigate('PaymentMethods');
      return;
    }
    if (id === 'sos') {
      navigation.navigate('SosDetails');
      return;
    }
    navigation.navigate('Notifications');
  };

  const toggleFaq = (key: string) => {
    setExpandedFaq(prev => (prev === key ? null : key));
  };

  return (
    <ProfileSubScreenLayout title="Help & Support">
      {dialog}
      {/* Personal emergency contact — from profile (not RACE helpline) */}
      {hasEmergency ? (
        <View
          style={{
            borderRadius: px(14),
            backgroundColor: '#DC2626',
            padding: px(14),
            marginBottom: px(18),
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
            <View
              style={{
                width: px(42),
                height: px(42),
                borderRadius: px(21),
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
              <Siren size={px(20)} color={colors.background} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ fontSize: px(12), fontWeight: typography.weights.bold, color: 'rgba(255,255,255,0.92)' }}>
                Your emergency contact
              </Text>
              <Text style={{ fontSize: px(15), fontWeight: typography.weights.extrabold, color: colors.background }}>
                {formatEmergencyPhoneDisplay(emergencyDigits)}
              </Text>
              <Text
                style={{ fontSize: px(10), color: 'rgba(255,255,255,0.85)', marginTop: px(2) }}
                numberOfLines={1}>
                {emergencyContact?.name}
                {emergencyContact?.relationship ? ` · ${emergencyContact.relationship}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => emergencyTel && void Linking.openURL(emergencyTel)}
              accessibilityRole="button"
              accessibilityLabel={`Call ${emergencyContact?.name ?? 'emergency contact'}`}
              style={{
                width: px(44),
                height: px(44),
                borderRadius: px(22),
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Phone size={px(20)} color="#DC2626" strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => navigation.navigate('PersonalInformation')}
          style={{
            borderRadius: px(14),
            borderWidth: 1,
            borderColor: '#FECACA',
            backgroundColor: '#FEF2F2',
            padding: px(14),
            marginBottom: px(18),
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
            <View
              style={{
                width: px(42),
                height: px(42),
                borderRadius: px(21),
                backgroundColor: 'rgba(220,38,38,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Siren size={px(20)} color="#DC2626" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>
                Please add your emergency contact
              </Text>
              <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(4), lineHeight: px(16) }}>
                Save a trusted person&apos;s number in your profile to call them quickly from here and SOS.
              </Text>
            </View>
            <ChevronRight size={px(20)} color={colors.grey} />
          </View>
        </Pressable>
      )}

      <SectionLabel px={px}>SELF-SERVICE</SectionLabel>
      <GroupedCard px={px}>
        {HELP_SELF_SERVE_LINKS.map((link, index) => {
          const Icon = SELF_SERVE_ICONS[link.id];
          return (
            <Pressable
              key={link.id}
              onPress={() => handleSelfServe(link.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(12),
                paddingHorizontal: px(14),
                paddingVertical: px(12),
                borderBottomWidth: index < HELP_SELF_SERVE_LINKS.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                backgroundColor: pressed ? colors.pageBg : colors.background,
              })}>
              <View
                style={{
                  width: px(34),
                  height: px(34),
                  borderRadius: px(17),
                  backgroundColor: colors.goldLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                <Icon size={px(16)} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: px(13), fontWeight: typography.weights.bold, color: colors.dark }}>
                  {link.title}
                </Text>
                <Text style={{ fontSize: px(10), color: colors.grey, marginTop: px(2) }}>{link.subtitle}</Text>
              </View>
              <ChevronRight size={px(16)} color={colors.grey} />
            </Pressable>
          );
        })}
      </GroupedCard>

      <SectionLabel px={px}>CONTACT US</SectionLabel>
      <GroupedCard px={px}>
        <ContactRow
          px={px}
          title="Phone support"
          subtitle={`${brand.phone} · Mon–Sun, 24 hours`}
          icon={<Phone size={px(18)} color={colors.primary} strokeWidth={2.2} />}
          onPress={() => void Linking.openURL(`tel:${brand.phoneRaw}`)}
        />
        <ContactRow
          px={px}
          title="Email"
          subtitle={brand.email}
          icon={<Mail size={px(18)} color={colors.primary} strokeWidth={2.2} />}
          onPress={() => void Linking.openURL(`mailto:${brand.email}`)}
        />
        <ContactRow
          px={px}
          title="WhatsApp"
          subtitle="Chat with support"
          icon={<WhatsAppIcon size={px(22)} />}
          onPress={() => void Linking.openURL(whatsappUrl)}
          isLast
        />
      </GroupedCard>

      <SectionLabel px={px}>COMMON QUESTIONS</SectionLabel>
      {HELP_FAQ_SECTIONS.map(section => (
        <View key={section.title} style={{ marginBottom: px(12) }}>
          <Text
            style={{
              fontSize: px(11),
              fontWeight: typography.weights.bold,
              color: colors.dark,
              marginBottom: px(6),
              marginLeft: px(2),
            }}>
            {section.title.charAt(0) + section.title.slice(1).toLowerCase()}
          </Text>
          <GroupedCard px={px}>
            {section.items.map((item, index) => {
              const key = `${section.title}-${index}`;
              const open = expandedFaq === key;
              return (
                <View
                  key={item.question}
                  style={{
                    borderBottomWidth: index < section.items.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}>
                  <Pressable
                    onPress={() => toggleFaq(key)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: px(10),
                      paddingHorizontal: px(14),
                      paddingVertical: px(13),
                      backgroundColor: pressed ? colors.pageBg : colors.background,
                    })}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: px(13),
                        fontWeight: typography.weights.semibold,
                        color: colors.dark,
                        lineHeight: px(18),
                      }}>
                      {item.question}
                    </Text>
                    <ChevronDown
                      size={px(18)}
                      color={colors.grey}
                      style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
                    />
                  </Pressable>
                  {open ? (
                    <Text
                      style={{
                        paddingHorizontal: px(14),
                        paddingBottom: px(14),
                        paddingTop: 0,
                        marginTop: px(-4),
                        fontSize: px(12),
                        color: colors.grey,
                        lineHeight: px(18),
                      }}>
                      {item.answer}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </GroupedCard>
        </View>
      ))}

      <SectionLabel px={px}>LEGAL</SectionLabel>
      <GroupedCard px={px}>
        <Pressable
          onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(12),
            paddingHorizontal: px(14),
            paddingVertical: px(13),
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: pressed ? colors.pageBg : colors.background,
          })}>
          <View
            style={{
              width: px(34),
              height: px(34),
              borderRadius: px(17),
              backgroundColor: colors.lightGrey,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Shield size={px(16)} color={colors.grey} strokeWidth={2.2} />
          </View>
          <Text style={{ flex: 1, fontSize: px(13), fontWeight: typography.weights.semibold, color: colors.dark }}>
            Terms of service
          </Text>
          <ChevronRight size={px(16)} color={colors.grey} />
        </Pressable>
        <Pressable
          onPress={() => void Linking.openURL('https://www.raceservice.in/terms.html')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(12),
            paddingHorizontal: px(14),
            paddingVertical: px(13),
            backgroundColor: pressed ? colors.pageBg : colors.background,
          })}>
          <View
            style={{
              width: px(34),
              height: px(34),
              borderRadius: px(17),
              backgroundColor: colors.lightGrey,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Shield size={px(16)} color={colors.grey} strokeWidth={2.2} />
          </View>
          <Text style={{ flex: 1, fontSize: px(13), fontWeight: typography.weights.semibold, color: colors.dark }}>
            Privacy policy
          </Text>
          <ChevronRight size={px(16)} color={colors.grey} />
        </Pressable>
        <Pressable
          onPress={() => {
            showDialog({
              tone: 'info',
              title: 'Delete account',
              message: `To permanently remove your account, call ${brand.phone} or email ${brand.email}. Our team will verify and delete your data.`,
              secondaryLabel: 'Cancel',
              primaryLabel: 'Call support',
              onPrimary: () => void Linking.openURL(`tel:${brand.phoneRaw}`),
            });
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: px(12),
            paddingHorizontal: px(14),
            paddingVertical: px(13),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: pressed ? colors.pageBg : colors.background,
          })}>
          <View
            style={{
              width: px(34),
              height: px(34),
              borderRadius: px(17),
              backgroundColor: '#FEE2E2',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Trash2 size={px(16)} color={colors.error} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: px(13), fontWeight: typography.weights.semibold, color: colors.error }}>
              Delete account
            </Text>
            <Text style={{ fontSize: px(11), color: colors.grey, marginTop: px(2) }}>
              Contact support to remove your data
            </Text>
          </View>
        </Pressable>
      </GroupedCard>

      <Text
        style={{
          textAlign: 'center',
          fontSize: px(10),
          color: colors.grey,
          marginTop: px(4),
          marginBottom: px(8),
          lineHeight: px(15),
        }}>
        RACE Customer · Version 1.0.0 · {brand.location}
      </Text>
    </ProfileSubScreenLayout>
  );
}
